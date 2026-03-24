import { NodeAgent } from '../src/index';

const agent = new NodeAgent({
  nodeId: 'my-node-001',
  nodeName: 'My AI Node',
  capabilities: ['llm', 'image_gen'],
  modelVersions: ['gpt-4', 'stable-diffusion'],
  apiKey: process.env.AIFACTORY_API_KEY!,
  serverUrl: process.env.AIFACTORY_URL || 'http://localhost:3001',
  pollingInterval: 10000,
  maxConcurrentTasks: 3,
  taskTimeout: 600,
  autoReleaseTimeout: true,
  taskHandler: async (task) => {
    console.log('[Example] Processing task:', task.id, task.type);

    switch (task.type) {
      case 'text_summary':
        const summary = task.input.content?.substring(0, 100) || '';
        console.log('[Example] Summarizing text:', summary);
        return { summary: `Summary: ${summary}` };

      case 'translation':
        console.log('[Example] Translating text to', task.input.targetLanguage);
        return {
          translatedText: `[Translated to ${task.input.targetLanguage}] ${task.input.text}`
        };

      case 'image_generation':
        console.log('[Example] Generating', task.input.imageCount || 1, 'images');
        return {
          images: [
            'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><text x="10" y="50">Generated Image</text></svg>'
          ]
        };

      case 'data_conversion':
        console.log('[Example] Converting data from', task.input.inputFormat, 'to', task.input.outputFormat);
        return { convertedData: '[Converted data]' };

      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  },
});

async function main() {
  try {
    await agent.start();
    console.log('[Example] Node agent started successfully');

    const status = agent.getStatus();
    console.log('[Example] Agent status:', status);

  } catch (error) {
    console.error('[Example] Failed to start agent:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  console.log('\n[Example] Shutting down...');
  agent.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Example] Shutting down...');
  agent.stop();
  process.exit(0);
});

main();
