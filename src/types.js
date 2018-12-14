const CONTEXT_SECTION = 'section';
const BLOCK_ATTR_TYPE = 'type';
const BLOCK_ATTR_TIME = 'time';
const BLOCK_TYPE_VERIFICATION = 'verification';
const BLOCK_TYPE_VERIFICATION_FAIL = 'verificationFail';
const BLOCK_TYPE_VERIFICATION_SUCCESS = 'verificationSuccess';
const BLOCK_TYPE_TASK_RESOURCE = 'taskResource';
const BLOCK_TYPE_WALKTHROUGH_RESOURCE = 'walkthroughResource';
const BLOCK_LEVEL_TASK = 1;
const BLOCK_LEVEL_STEP = 2;

class Verification {
  constructor(html, successBlock, failBlock) {
    this._html = html;
    this._successBlock = successBlock;
    this._failBlock = failBlock;
  }

  get html() {
    return this._html;
  }

  get hasSuccessBlock() {
    return !!this._successBlock;
  }

  get hasFailBlock() {
    return !!this._failBlock;
  }

  get successBlock() {
    return this._successBlock;
  }

  get failBlock() {
    return this._failBlock;
  }

  static canConvert(block) {
    return block.getAttribute(BLOCK_ATTR_TYPE) === BLOCK_TYPE_VERIFICATION;
  }

  static fromAdoc(adoc, success, fail) {
    return new Verification(adoc.convert(), success, fail);
  }
}

class VerificationSuccess {
  constructor(html) {
    this._html = html;
  }

  get html() {
    return this._html;
  }

  static canConvert(block) {
    return block.getAttribute(BLOCK_ATTR_TYPE) === BLOCK_TYPE_VERIFICATION_SUCCESS;
  }

  static fromAdoc(adoc) {
    return new VerificationSuccess(adoc.convert());
  }

  static findNextForVerification(blocks) {
    for (const block of blocks) {
      if (Verification.canConvert(block)) {
        return null;
      }
      if (VerificationSuccess.canConvert(block)) {
        return VerificationSuccess.fromAdoc(block);
      }
    }
    return null;
  }
}

class VerificationFail {
  constructor(html) {
    this._html = html;
  }

  get html() {
    return this._html;
  }

  static canConvert(block) {
    return block.getAttribute(BLOCK_ATTR_TYPE) === BLOCK_TYPE_VERIFICATION_FAIL;
  }

  static fromAdoc(adoc) {
    return new VerificationFail(adoc.convert());
  }

  static findNextForVerification(blocks) {
    for (const block of blocks) {
      if (Verification.canConvert(block)) {
        return null;
      }
      if (VerificationFail.canConvert(block)) {
        return VerificationFail.fromAdoc(block);
      }
    }
    return null;
  }
}

class Paragraph {
  constructor(html) {
    this._html = html;
  }

  get html() {
    return this._html;
  }

  static canConvert(block) {
    return (
      !Verification.canConvert(block) &&
      !VerificationFail.canConvert(block) &&
      !VerificationSuccess.canConvert(block)
    );
  }

  static fromAdoc(adoc) {
    return new Paragraph(adoc.convert());
  }
}

class TaskResource {
  constructor(html, service, title) {
    this._html = html;
    this._serviceName = service;
    this._title = title;
  }

  get title() {
    return this._title;
  }

  get html() {
    return this._html;
  }

  get serviceName() {
    return this._serviceName;
  }

  static canConvert(adoc) {
    return (
      adoc.context === CONTEXT_SECTION &&
      adoc.level === BLOCK_LEVEL_STEP &&
      adoc.getAttribute(BLOCK_ATTR_TYPE) === BLOCK_TYPE_TASK_RESOURCE
    );
  }

  static fromAdoc(adoc) {
    const service = adoc.getAttribute('serviceName');
    const html = adoc.blocks[0] ? adoc.blocks[0].convert() : '';
    return new TaskResource(html, service, adoc.title);
  }
}

class WalkthroughResource {
  constructor(html, service, title) {
    this._html = html;
    this._serviceName = service;
    this._title = title;
  }

  get title() {
    return this._title;
  }

  get html() {
    return this._html;
  }

  get serviceName() {
    return this._serviceName;
  }

  static canConvert(adoc) {
    return (
      adoc.context === CONTEXT_SECTION &&
      adoc.level === BLOCK_LEVEL_STEP &&
      adoc.getAttribute(BLOCK_ATTR_TYPE) === BLOCK_TYPE_WALKTHROUGH_RESOURCE
    );
  }

  static fromAdoc(adoc) {
    const service = adoc.getAttribute('serviceName');
    const html = adoc.blocks[0] ? adoc.blocks[0].convert() : '';
    return new WalkthroughResource(html, service, adoc.title);
  }
}

class Procedure {
  constructor(title, blocks) {
    this._title = title;
    this._blocks = blocks;
  }

  get title() {
    return this._title;
  }

  get blocks() {
    return this._blocks;
  }

  static canConvert(adoc) {
    return adoc.context === CONTEXT_SECTION && adoc.level === BLOCK_LEVEL_STEP;
  }

  static fromAdoc(adoc) {
    const title = adoc.title;
    const blocks = adoc.blocks.reduce((acc, b, i, blockList) => {
      if (Verification.canConvert(b)) {
        const remainingBlocks = blockList.slice(i + 1, blockList.length);
        const successBlock = VerificationSuccess.findNextForVerification(remainingBlocks);
        const failBlock = VerificationFail.findNextForVerification(remainingBlocks);
        acc.push(new Verification(b.convert(), successBlock, failBlock));
      }
      if (Paragraph.canConvert(b)) {
        acc.push(new Paragraph(b.convert()));
      }
      return acc;
    }, []);
    return new Procedure(title, blocks);
  }
}

class Task {
  constructor(title, time, html, procedures, resources) {
    this._title = title;
    this._time = time;
    this._html = html;
    this._procedures = procedures;
    this._resources = resources;
  }

  get title() {
    return this._title;
  }

  get time() {
    return this._time;
  }

  get html() {
    return this._html;
  }

  get procedures() {
    return this._procedures.filter(s => !(s instanceof TaskResource));
  }

  get resources() {
    return this._resources;
  }

  static canConvert(adoc) {
    return adoc.context === CONTEXT_SECTION && adoc.level === BLOCK_LEVEL_TASK;
  }

  // Task resources can be defined at task or step level so we have to recursively check all blocks
  // that are lower in the document hierarchy
  static collectTaskResources(task, collected) {
    task.blocks.forEach(block => {
      if (TaskResource.canConvert(block)) {
        collected.push(TaskResource.fromAdoc(block));
      } else if (block.blocks.length > 0) {
        this.collectTaskResources(block, collected);
      }
    });
  }

  static fromAdoc(adoc) {
    const title = adoc.title;
    const time = parseInt(adoc.getAttribute(BLOCK_ATTR_TIME), 10) || 0;
    const collectedResources = [];
    this.collectTaskResources(adoc, collectedResources);
    const procedures = adoc.blocks.reduce((acc, b) => {
      if (Procedure.canConvert(b)) {
        acc.push(Procedure.fromAdoc(b));
      } else if (Paragraph.canConvert(b)) {
        acc.push(Paragraph.fromAdoc(b));
      }
      return acc;
    }, []);

    return new Task(title, time, adoc.convert(), procedures, collectedResources);
  }
}

class Walkthrough {
  constructor(title, preamble, time, tasks, resources) {
    this._title = title;
    this._preamble = preamble;
    this._time = time;
    this._tasks = tasks;
    this._resources = resources;
  }

  get title() {
    return this._title;
  }

  get preamble() {
    return this._preamble;
  }

  get time() {
    return this._time;
  }

  get tasks() {
    return this._tasks;
  }

  get resources() {
    return this._resources;
  }

    // Walkthrough resources are always defined at preamble level
  static collectWalkthroughResources(preamble) {
    const resources = [];
    preamble.blocks = preamble.blocks.reduce((acc, block) => {
      if (WalkthroughResource.canConvert(block)) {
        resources.push(WalkthroughResource.fromAdoc(block));
      } else {
        acc.push(block);
      }
      return acc;
    }, []);
    return resources;
  }

  static fromAdoc(adoc) {
    const title = adoc.getDocumentTitle();
    if (adoc.blocks.length < 1) {
      throw new Error(`Invalid Walkthrough ${title}`);
    }
    const resources = this.collectWalkthroughResources(adoc.blocks[0]);
    const preamble = adoc.blocks[0].convert();
    const tasks = adoc.blocks.filter(b => Task.canConvert(b)).map(b => Task.fromAdoc(b));
    const time = tasks.reduce((acc, t) => acc + t._time || 0, 0);
    return new Walkthrough(title, preamble, time, tasks, resources);

  }
}

export default Walkthrough;