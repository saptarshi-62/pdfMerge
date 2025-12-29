function parsePages(str) {
  const pages = [];
  str.split(',').forEach(part => {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      for (let i = start; i <= end; i++) pages.push(i);
    } else {
      pages.push(Number(part));
    }
  });
  return pages;
}

module.exports = parsePages;
