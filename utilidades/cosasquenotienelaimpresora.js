  /**
   * Printer Buzzer (Beep sound)
   * @param  {[Number]} n Refers to the number of buzzer times
   * @param  {[Number]} t Refers to the buzzer sound length in (t * 100) milliseconds.
   */
  beep(n: number, t: number) {
    this.buffer.write(BEEP);
    this.buffer.writeUInt8(n);
    this.buffer.writeUInt8(t);
    return this;
  }