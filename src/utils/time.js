export const parseLocalDate = (input) => {
  if (typeof input === 'string') {
    const m = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const [_, y, mo, d] = m;
      return new Date(Number(y), Number(mo) - 1, Number(d)); // local
    }
    return new Date(input); // ISO có timezone vẫn đúng theo offset
  }
  return new Date(input);
};

export const startOfLocalDay = (input) => {
  const d = parseLocalDate(input);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const endOfLocalDay = (input) => {
  const d = parseLocalDate(input);
  d.setHours(23, 59, 59, 999);
  return d;
};

export const localDayKey = (input) => {
  const d = parseLocalDate(input);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};