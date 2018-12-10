import Asciidoctor from "asciidoctor.js"
import Walkthrough from "./types"

const asciidoctor = Asciidoctor();

function printMessages(logger) {
  const messages = logger.getMessages();
  if (!messages) {
    return;
  }

  messages.forEach(message => {
    const { severity, message: { text, source_location} } = message;
    console.error(`${severity} ${text} at ${source_location}`);
  });

  // process.exit(1);
}

export function parse (buffer, attributes, context) {
  const logger = asciidoctor.MemoryLogger.$new();
  asciidoctor.LoggerManager.setLogger(logger);
  const adoc = asciidoctor.load(buffer, attributes);
  const walkthrough = Walkthrough.fromAdoc(adoc);
  printMessages(logger);
  return walkthrough;
};