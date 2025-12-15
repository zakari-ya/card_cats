const apiBase = ""; // same origin (served by express)

function qs(sel, parent = document) {
  return parent.querySelector(sel);
}

let cachedCats = null;

function debounce(fn, wait = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function showConfirm(message) {
  return new Promise((resolve) => {
    const modal = qs("#confirm-modal");
    const msg = qs(".confirm-message", modal);
    msg.textContent = message;
    modal.classList.remove("hidden");

    const yes = qs(".confirm-yes", modal);
    const no = qs(".confirm-no", modal);

    function cleanup(result) {
      modal.classList.add("hidden");
      yes.removeEventListener("click", onYes);
      no.removeEventListener("click", onNo);
      resolve(result);
    }

    function onYes() {
      cleanup(true);
    }
    function onNo() {
      cleanup(false);
    }

    yes.addEventListener("click", onYes);
    no.addEventListener("click", onNo);
  });
}

function showToast(msg, timeout = 3000) {
  const t = qs("#toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.remove("hidden");
  t.classList.add("show");
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => {
    t.classList.remove("show");
    t.classList.add("hidden");
  }, timeout);
}

async function fetchCats() {
  if (cachedCats) return cachedCats;
  const res = await fetch(`${apiBase}/cats`);
  if (!res.ok) throw new Error("Failed to load cats");
  cachedCats = await res.json();
  return cachedCats;
}

function createCard(cat) {
  const el = document.createElement("div");
  el.className = "card";
  el.innerHTML = `
    <img src="${cat.img || "https://placekitten.com/300/200"}" alt="${
    cat.name
  }">
    <div class="card-body">
      <h3>${cat.name}</h3>
      <p class="tag">${cat.tag || ""}</p>
      <p class="descr">${cat.descrpt || ""}</p>
      <div class="actions">
        <button class="edit">Edit</button>
        <button class="delete">Delete</button>
      </div>
    </div>
  `;

  qs(".delete", el).addEventListener("click", async () => {
    const ok = await showConfirm(`Delete ${cat.name}?`);
    if (!ok) return;
    await fetch(`${apiBase}/cats/${cat.id}`, { method: "DELETE" });
    cachedCats = null;
    render();
  });

  qs(".edit", el).addEventListener("click", () => openForm(cat));

  return el;
}

async function render() {
  const container = qs("#cards");
  container.innerHTML = "";
  try {
    let cats = await fetchCats();
    if (!cats || cats.length === 0) {
      container.innerHTML = "<p>No cats yet.</p>";
      return;
    }

    const q = qs("#search") ? qs("#search").value.trim().toLowerCase() : "";
    if (q) {
      cats = cats.filter((c) => {
        const name = (c.name || "").toLowerCase();
        const tag = (c.tag || "").toLowerCase();
        const descr = (c.descrpt || "").toLowerCase();
        return name.includes(q) || tag.includes(q) || descr.includes(q);
      });
    }

    if (cats.length === 0) {
      container.innerHTML = "<p>No cats match your search.</p>";
      return;
    }

    cats.forEach((c) => container.appendChild(createCard(c)));
  } catch (err) {
    container.innerHTML = `<p class=error>${err.message}</p>`;
  }
}

function openForm(cat = null) {
  const modal = qs("#add-modal");
  modal.classList.remove("hidden");
  qs("#cat-id").value = cat ? cat.id : "";
  qs("#name").value = cat ? cat.name : "";
  qs("#tag").value = cat ? cat.tag || "" : "";
  qs("#descrpt").value = cat ? cat.descrpt || "" : "";
  qs("#img").value = cat ? cat.img || "" : "";
}

function closeForm() {
  qs("#add-modal").classList.add("hidden");
}

async function saveForm(e) {
  e.preventDefault();
  const id = qs("#cat-id").value;
  const payload = {
    name: qs("#name").value.trim(),
    tag: qs("#tag").value.trim() || null,
    descrpt: qs("#descrpt").value.trim() || null,
    img: qs("#img").value.trim() || null,
  };

  if (!payload.name) {
    showToast("Name is required");
    return;
  }

  if (id) {
    await fetch(`${apiBase}/cats/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } else {
    await fetch(`${apiBase}/cats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  closeForm();
  cachedCats = null;
  render();
}

document.addEventListener("DOMContentLoaded", () => {
  render();
  qs("#open-add").addEventListener("click", () => openForm());
  qs("#cancel").addEventListener("click", closeForm);
  qs("#add-form").addEventListener("submit", saveForm);
  const searchEl = qs("#search");
  if (searchEl)
    searchEl.addEventListener(
      "input",
      debounce(() => render(), 200)
    );
});
