export const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

export const mapSlice = <A, B>(array: A[], start: number, end: number, map: (item: A) => B): B[] => {
  const ret = [];
  end = Math.min(array.length, start + end);
  for (let i = start; i < end; ++i) {
    ret.push(map(array[i]));
  }
  return ret;
};
