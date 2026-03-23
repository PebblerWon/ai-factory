import { NodeAgent } from '../src/index';

const agent = new NodeAgent({
  nodeId: 'my-node-001',
  nodeName: 'My AI Node',
  capabilities: ['llm', 'image_gen'],
  modelVersions: ['gpt-4', 'stable-diffusion'],
  token: 'your-jwt-token',
  taskHandler: async (task) => {
    console.log('Received task:', task);

    switch (task.type) {
      case 'text_summary':
        return {
          summary: `Summary of: ${task.input.content?.substring(0, 50)}...`,
        };

      case 'translation':
        return {
          translatedText: `[Translated] ${task.input.text}`,
        };

      case 'image_generation':
        return {
          images: [
            'data:image/svg+xml,...',
          ],
        };

      case 'data_conversion':
        return {
          convertedData: '[Converted data]',
        };

      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  },
});

agent.connect();

process.on('SIGINT', () => {
  console.log('Shutting down...');
  agent.disconnect();
  process.exit(0);
});
