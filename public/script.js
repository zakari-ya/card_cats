const apiBase = ""; // same origin (served by express)

function qs(sel, parent = document) {
  return parent.querySelector(sel);
}

async function fetchCats() {
  const res = await fetch(`${apiBase}/cats`);
  if (!res.ok) throw new Error("Failed to load cats");
  return res.json();
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
    if (!confirm(`Delete ${cat.name}?`)) return;
    await fetch(`${apiBase}/cats/${cat.id}`, { method: "DELETE" });
    render();
  });

  qs(".edit", el).addEventListener("click", () => openForm(cat));

  return el;
}

async function render() {
  const container = qs("#cards");
  container.innerHTML = "";
  try {
    const cats = await fetchCats();
    if (!cats || cats.length === 0) {
      container.innerHTML = "<p>No cats yet.</p>";
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

  if (!payload.name) return alert("Name is required");

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
  render();
}

document.addEventListener("DOMContentLoaded", () => {
  render();
  qs("#open-add").addEventListener("click", () => openForm());
  qs("#cancel").addEventListener("click", closeForm);
  qs("#add-form").addEventListener("submit", saveForm);
});
