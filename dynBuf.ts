type DynBuf = {
  data: Buffer;
  // current amount of data in buffer
  length: number;
};

// append data to DynBuf
export function bufPush(buf: DynBuf, data: Buffer): void {
  const newLen = buf.length + data.length;
  // check if current buf length if less the newLen with data
  if (buf.data.length < newLen) {
    // grow the capacity by the power of two
    let cap = Math.max(buf.data.length, 32);
    // multiply capacity by 2 until it is more than newLen
    while (cap < newLen) {
      cap *= 2;
    }
    const grownBuf = Buffer.alloc(cap);
    buf.data.copy(grownBuf, 0, 0);
    buf.data = grownBuf;
    buf.length = cap;
  }

  data.copy(buf.data, buf.length, 0);
  buf.length = newLen;
}

// pop data from front and shift later data to the start
export function bufPop(buf: DynBuf, len: number): void {
  // buf.copyWithin(dst_start, src_start, src_end)
  buf.data.copyWithin(0, len, buf.length);
  buf.length -= len;
}

// check iff the message is complete using the delimiter
export function cutMessage(buf: DynBuf): null | Buffer {
  // get index of delimiter
  const delimIdx = buf.data.subarray(0, buf.length).indexOf("\n");
  // check if is it present or not
  if (delimIdx < 0) {
    return null;
  }
  // if present copy the part from start of buf to \n
  const msg = Buffer.from(buf.data.subarray(0, delimIdx + 1));
  bufPop(buf, delimIdx + 1);
  return msg;
}
