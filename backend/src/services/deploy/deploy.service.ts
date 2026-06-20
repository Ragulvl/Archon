/**
 * Deployment Engine — Abstract interface and Vercel implementation.
 *
 * Supports multiple deployment targets through a common interface.
 */

import prisma from '../../db/prisma.client';
import { getProjectFilesWithContent } from '../files/files.service';
import { createError } from '../../middleware/error.middleware';
import { aiLogger } from '../../utils/logger';

// ─── Interface ───────────────────────────────────────────────────────────────

export interface DeployConfig {
  projectId: string;
  userId: string;
  provider: 'vercel' | 'railway' | 'render';
  apiToken?: string;
  teamId?: string;
  projectName?: string;
  envVars?: Record<string, string>;
}

export interface DeployResult {
  deploymentId: string;
  url: string;
  status: 'pending' | 'building' | 'ready' | 'error';
  provider: string;
  logs?: string;
}

export interface IDeployProvider {
  deploy(config: DeployConfig, files: Record<string, string>): Promise<DeployResult>;
  getStatus(deploymentId: string): Promise<DeployResult>;
  cancel(deploymentId: string): Promise<void>;
}

// ─── Deploy Orchestrator ─────────────────────────────────────────────────────

/**
 * Deploy a project to the specified provider.
 * Persists deployment record in the Deployment model.
 */
export async function deployProject(config: DeployConfig): Promise<DeployResult> {
  // Load project files
  const files = await getProjectFilesWithContent(config.projectId);
  if (files.length === 0) throw createError('No files to deploy', 400);

  const fileMap: Record<string, string> = {};
  for (const f of files) {
    if (f.content) fileMap[f.path] = f.content;
  }

  // Create deployment record
  const deployment = await prisma.deployment.create({
    data: {
      projectId: config.projectId,
      provider: config.provider,
      status: 'pending',
      metadata: { userId: config.userId },
    },
  });

  try {
    // Get provider implementation
    const provider = getProvider(config.provider);
    const result = await provider.deploy(config, fileMap);

    // Update deployment record
    await prisma.deployment.update({
      where: { id: deployment.id },
      data: {
        status: result.status,
        url: result.url,
        logs: result.logs,
      },
    });

    aiLogger.info(`Deployment ${deployment.id} to ${config.provider}: ${result.status}`);
    return { ...result, deploymentId: deployment.id };
  } catch (err) {
    await prisma.deployment.update({
      where: { id: deployment.id },
      data: {
        status: 'failed',
        logs: (err as Error).message,
      },
    });
    throw err;
  }
}

/**
 * Get deployment status.
 */
export async function getDeploymentStatus(deploymentId: string) {
  return prisma.deployment.findUnique({
    where: { id: deploymentId },
    select: {
      id: true,
      provider: true,
      status: true,
      url: true,
      logs: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * List all deployments for a project.
 */
export async function listDeployments(projectId: string) {
  return prisma.deployment.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      provider: true,
      status: true,
      url: true,
      createdAt: true,
    },
  });
}

// ─── Provider Registry ───────────────────────────────────────────────────────

function getProvider(name: string): IDeployProvider {
  switch (name) {
    case 'vercel':
      return new VercelProvider();
    default:
      throw createError(`Deploy provider "${name}" not yet implemented`, 501);
  }
}

// ─── Vercel Provider ─────────────────────────────────────────────────────────

class VercelProvider implements IDeployProvider {
  private baseUrl = 'https://api.vercel.com';

  async deploy(config: DeployConfig, files: Record<string, string>): Promise<DeployResult> {
    if (!config.apiToken) {
      throw createError('Vercel API token required for deployment', 400);
    }

    // Build Vercel file array
    const vercelFiles = Object.entries(files).map(([path, content]) => ({
      file: path,
      data: Buffer.from(content).toString('base64'),
      encoding: 'base64',
    }));

    const deployPayload = {
      name: config.projectName ?? `archon-${config.projectId.slice(0, 8)}`,
      files: vercelFiles,
      projectSettings: {
        framework: 'vite',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        installCommand: 'npm install',
      },
      ...(config.teamId ? { teamId: config.teamId } : {}),
    };

    const response = await fetch(`${this.baseUrl}/v13/deployments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiToken}`,
      },
      body: JSON.stringify(deployPayload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw createError(`Vercel deployment failed: ${error}`, 502);
    }

    const result: any = await response.json();

    return {
      deploymentId: result.id,
      url: `https://${result.url}`,
      status: result.readyState === 'READY' ? 'ready' : 'building',
      provider: 'vercel',
    };
  }

  async getStatus(deploymentId: string): Promise<DeployResult> {
    // Would query Vercel API for status
    return {
      deploymentId,
      url: '',
      status: 'pending',
      provider: 'vercel',
    };
  }

  async cancel(deploymentId: string): Promise<void> {
    // Would cancel Vercel deployment
    aiLogger.info(`Cancelling Vercel deployment: ${deploymentId}`);
  }
}
