import { Configuration, OpenAIApi } from 'openai';
import config from 'config';
import { createReadStream } from 'fs';

class OpenAI {
  roles = {
    ASSISTANT: 'assistant',
    USER: 'user',
    SYSTEM: 'system',
  };

  finishReason = {
    STOP: 'stop',
    LENGTH: 'length',
    FUNCTION: 'function_call',
  };

  constructor(apiKey) {
    const configuration = new Configuration({
      apiKey,
    });
    this.openai = new OpenAIApi(configuration);
  }

  async chat(messages) {
    const messageGPT = {};
    try {
      const response = await this.openai.createChatCompletion({
        messages: messages,
        model: 'gpt-3.5-turbo',
      });
      messageGPT.finishReason = response.data.choices[0].finish_reason;
      messageGPT.message = response.data.choices[0].message.content;
      return messageGPT;
    } catch (e) {
      console.log('Error while gpt chat', e.message);
      messageGPT.status = e.response.status;
      return messageGPT;
    }
  }

  async transcription(filepath) {
    try {
      const response = await this.openai.createTranscription(
        createReadStream(filepath),
        'whisper-1'
      );
      return response.data.text;
    } catch (e) {
      console.log('Error while transcription', e.message);
    }
  }
}

export const openai = new OpenAI(config.get('OPENAI_KEY'));
