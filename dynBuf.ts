export type DynBuf = {
  data: Buffer;
  // current amount of data in buffer
  length: number;
};

/**
 * Appends data to the dynamic buffer, growing its capacity if necessary.
 *
 * @param {DynBuf} buf - The dynamic buffer to append data to.
 * @param {Buffer} data - The data to append.
 */
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
  }

  data.copy(buf.data, buf.length, 0);
  buf.length = newLen;
}

/**
 * Removes data from the front of the dynamic buffer and shifts the remaining data to the start.
 *
 * @param {DynBuf} buf - The dynamic buffer to modify.
 * @param {number} len - The number of bytes to remove from the front.
 */
export function bufPop(buf: DynBuf, len: number): void {
  buf.data.copyWithin(0, len, buf.length);
  // optimization to implement pipelined requests
  // to test echo -e 'hello\nworld' | socat TCP:127.0.0.1:8000 -
  buf.length -= len;
}

/**
 * Checks if the message in the buffer is complete using a delimiter (`\n`).
 * If complete, extracts the message and removes it from the buffer.
 *
 * @param {DynBuf} buf - The dynamic buffer to check.
 * @returns {Buffer | null} - The complete message as a Buffer, or `null` if no complete message is found.
 */ export function cutMessage(buf: DynBuf): null | Buffer {
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
