export const renderDimensions = (t, w, l) => {
  const thick = t && t != 0 ? t : '~D';
  const width = w && w != 0 ? w : '~R';
  const length = l && l != 0 ? l : '~L';
  return `${thick} × ${width} × ${length}`;
};

export const renderQuantity = (q) => {
  return q && q != 0 ? q : '--';
};
