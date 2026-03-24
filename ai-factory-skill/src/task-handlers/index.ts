import { TaskInput, TaskRequirements, TaskOutput, TaskHandler } from '../types';

export const textSummaryHandler: TaskHandler = async (
  input: TaskInput,
  requirements: TaskRequirements
): Promise<TaskOutput> => {
  const content = input.content;

  if (!content) {
    throw new Error('Missing required field: content');
  }

  console.log(`[Handler:TextSummary] Processing content of length ${content.length}`);

  // Simulate text summarization
  // In a real implementation, this would call an LLM API
  const summary = content.length > 100
    ? content.substring(0, 100) + '...'
    : content;

  // Apply max length constraint if specified
  const maxLength = requirements.maxLength;
  const finalSummary = maxLength && summary.length > maxLength
    ? summary.substring(0, maxLength) + '...'
    : summary;

  console.log(`[Handler:TextSummary] Generated summary of length ${finalSummary.length}`);

  return {
    result: finalSummary
  };
};

export const translationHandler: TaskHandler = async (
  input: TaskInput,
  requirements: TaskRequirements
): Promise<TaskOutput> => {
  const { text, sourceLanguage, targetLanguage } = input;

  if (!text) {
    throw new Error('Missing required field: text');
  }

  if (!targetLanguage) {
    throw new Error('Missing required field: targetLanguage');
  }

  console.log(`[Handler:Translation] Translating from ${sourceLanguage || 'auto'} to ${targetLanguage}`);

  // Simulate translation
  // In a real implementation, this would call a translation API
  const translatedText = `[Translated to ${targetLanguage}] ${text}`;

  console.log(`[Handler:Translation] Translation completed`);

  return {
    result: translatedText
  };
};

export const imageGenerationHandler: TaskHandler = async (
  input: TaskInput,
  requirements: TaskRequirements
): Promise<TaskOutput> => {
  const { content, imageStyles, imageCount, imageSize } = input;

  if (!content) {
    throw new Error('Missing required field: content (image prompt)');
  }

  console.log(`[Handler:ImageGen] Generating ${imageCount || 1} image(s) with style: ${imageStyles?.join(', ') || 'default'}`);

  // Simulate image generation
  // In a real implementation, this would call an image generation API
  const count = imageCount || 1;
  const images = Array(count).fill(null).map((_, i) => {
    return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="${imageSize || '512'}" height="${imageSize || '512'}"><text x="10" y="50">Generated Image ${i + 1}</text><text x="10" y="80" font-size="12">Prompt: ${content.substring(0, 50)}...</text></svg>`;
  });

  console.log(`[Handler:ImageGen] Generated ${images.length} image(s)`);

  return {
    images
  };
};

export const dataConversionHandler: TaskHandler = async (
  input: TaskInput,
  requirements: TaskRequirements
): Promise<TaskOutput> => {
  const { content, inputFormat, outputFormat } = input;

  if (!content) {
    throw new Error('Missing required field: content (data to convert)');
  }

  if (!outputFormat) {
    throw new Error('Missing required field: outputFormat');
  }

  console.log(`[Handler:DataConversion] Converting from ${inputFormat || 'auto'} to ${outputFormat}`);

  // Simulate data conversion
  // In a real implementation, this would parse and convert the data
  let convertedData = content;

  // Apply format conversion based on requirements
  if (outputFormat === 'json') {
    // Try to parse as JSON if it's CSV or other format
    try {
      const parsed = JSON.parse(content);
      convertedData = JSON.stringify(parsed, null, 2);
    } catch {
      // If not valid JSON, wrap it
      convertedData = JSON.stringify({ data: content }, null, 2);
    }
  } else if (outputFormat === 'csv') {
    // Try to convert to CSV
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        const headers = Object.keys(parsed[0] || {});
        const rows = parsed.map(item => headers.map(h => item[h] || '').join(','));
        convertedData = [headers.join(','), ...rows].join('\n');
      } else {
        const headers = Object.keys(parsed);
        const values = headers.map(h => parsed[h] || '').join(',');
        convertedData = [headers.join(','), values].join('\n');
      }
    } catch {
      // If not valid JSON, keep as-is
      convertedData = content;
    }
  }

  console.log(`[Handler:DataConversion] Conversion completed`);

  return {
    convertedData
  };
};

// Default handlers export
export const defaultHandlers = {
  text_summary: textSummaryHandler,
  translation: translationHandler,
  image_generation: imageGenerationHandler,
  data_conversion: dataConversionHandler
};
