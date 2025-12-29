/*function parsePages(str) {
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
}*/

// optional helper
function showSimple() {
  document.getElementById("simple-merge").style.display = "block";
  document.getElementById("custom-merge").style.display = "none";
}

function showCustom() {
  document.getElementById("simple-merge").style.display = "none";
  document.getElementById("custom-merge").style.display = "block";
}

document.getElementById("year").textContent = new Date().getFullYear();
