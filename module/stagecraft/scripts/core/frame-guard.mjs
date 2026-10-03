/**
 * One bad frame must not end the show. A frame that throws (a card half built during a rebuild, say) is counted and
 * skipped and the next one is tried; a stage that has failed `limit` frames in a row is given up on, so its host can
 * hand Foundry's own canvas back instead of freezing the table's screen. Pure.
 */

export class FrameGuard {
  constructor({ limit = 600, report = () => {}, onFatal = () => {} } = {}) {
    this.limit = limit;
    this.report = report;
    this.onFatal = onFatal;
    this.failures = 0;          // frames that threw, in a row
    this.total = 0;             // frames that threw, ever
  }

  /** Run one frame. Returns false when the stage has given up (and only then), so the caller stops asking for frames. */
  run(frame) {
    try {
      frame();
      this.failures = 0;
      return true;
    } catch (err) {
      this.failures++;
      this.total++;
      // the first few are worth reading; after that, one in a few hundred, so a broken stage does not drown the console
      if (this.failures <= 3 || this.failures % 300 === 0) this.report(err, this.failures);
      if (this.failures >= this.limit) {
        this.onFatal(err);
        return false;
      }
      return true;
    }
  }
}
