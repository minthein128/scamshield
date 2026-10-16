export interface SseEvent {
  event: string;
  data: string;
}

/** Incremental text/event-stream parser. Feed it decoded chunks; it emits whole events. */
export function createSseParser(onEvent: (e: SseEvent) => void) {
  let buffer = '';
  const flush = (block: string) => {
    let event = 'message';
    const data: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
    }
    if (data.length) onEvent({ event, data: data.join('\n') });
  };
  return {
    push(chunk: string) {
      buffer += chunk.replace(/\r\n/g, '\n');
      let i = buffer.indexOf('\n\n');
      while (i >= 0) {
        flush(buffer.slice(0, i));
        buffer = buffer.slice(i + 2);
        i = buffer.indexOf('\n\n');
      }
    },
    end() {
      if (buffer.trim()) flush(buffer);
      buffer = '';
    },
  };
}
