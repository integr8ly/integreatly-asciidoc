import Asciidoctor from "asciidoctor.js"
import Walkthrough from "./types"

const asciidoctor = Asciidoctor();

function reportAndCheckSuccess(logger, context) {
  const messages = logger.getMessages();
  let success = true;

  messages.forEach(message => {
    const { severity, message: { text, source_location} } = message;
    if (severity === 'ERROR') {
      success = success && false;
    } else if (severity === 'WARN' && context['warnings'] === 'error') {
      success = success && false;
    }

    console.error(`${severity} ${text} at ${source_location}`);
  });

  return success;
}

export function parse (buffer, attributes) {
  const adoc = asciidoctor.load(buffer, attributes);
  const walkthrough = Walkthrough.fromAdoc(adoc);
  reportAndCheckSuccess(logger);
  return walkthrough;
};

export function check (buffer, context) {
  const logger = asciidoctor.MemoryLogger.$new();
  asciidoctor.LoggerManager.setLogger(logger);
  const adoc = asciidoctor.load(buffer);
  Walkthrough.fromAdoc(adoc);
  return reportAndCheckSuccess(logger, context);
};