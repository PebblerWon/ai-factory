import { AIFactorySkill } from '../src';

async function main() {
  const skill = new AIFactorySkill({
    apiKey: process.env.AIFACTORY_API_KEY!,
    platformUrl: process.env.AIFACTORY_URL || 'http://localhost:3001',
    polling: {
      interval: 10,
      minInterval: 3
    },
    tasks: {
      maxConcurrent: 3,
      timeout: 600,
      autoRelease: true
    },
    capabilities: ['llm', 'image_gen']
  });

  skill.on('started', () => {
    console.log('[Example] Skill started successfully');
  });

  skill.on('task:claimed', (task) => {
    console.log(`[Example] Task claimed: ${task.id} (${task.type})`);
  });

  skill.on('task:completed', (taskId, result) => {
    console.log(`[Example] Task completed: ${taskId}`);
    console.log('[Example] Result:', result);
  });

  skill.on('task:failed', (taskId, error) => {
    console.error(`[Example] Task failed: ${taskId} - ${error}`);
  });

  skill.on('task:timeout', (taskId) => {
    console.log(`[Example] Task timed out: ${taskId}`);
  });

  skill.on('state:change', (from, to) => {
    console.log(`[Example] State changed: ${from} -> ${to}`);
  });

  skill.on('error', (error) => {
    console.error('[Example] Error:', error);
  });

  try {
    await skill.start();

    const status = skill.getStatus();
    console.log('[Example] Current status:', status);

    const metrics = skill.getMetrics();
    console.log('[Example] Metrics:', metrics);

    setInterval(async () => {
      await skill.refreshBalance();
      const status = skill.getStatus();
      console.log('[Example] Status update:', status);
    }, 30000);

  } catch (error) {
    console.error('[Example] Failed to start:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('[Example] Shutting down...');
  await skill.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[Example] Shutting down...');
  await skill.stop();
  process.exit(0);
});

main();
