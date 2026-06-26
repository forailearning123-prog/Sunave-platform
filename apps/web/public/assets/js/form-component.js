export function buildField(field) {
  if (field.type === 'checkbox') {
    return `
      <label>
        <input type="checkbox" name="${field.name}" ${field.checked ? 'checked' : ''} /> ${field.label}
      </label>
    `;
  }

  if (field.type === 'select') {
    return `
      <label>${field.label}</label>
      <select name="${field.name}" required>
        ${field.options.map((opt) => `<option value="${opt}">${opt}</option>`).join('')}
      </select>
    `;
  }

  return `
    <label>${field.label}</label>
    <input type="${field.type || 'text'}" name="${field.name}" ${field.required !== false ? 'required' : ''} />
  `;
}

export function renderForm({ rootId, title, fields, submitLabel, helper }) {
  const root = document.getElementById(rootId);
  root.innerHTML = `
    <h1>${title}</h1>
    <form id="app-form">
      ${fields.map((field) => buildField(field)).join('')}
      <button type="submit">${submitLabel}</button>
      ${helper ? `<p class="helper">${helper}</p>` : ''}
      <p id="error" class="error"></p>
      <p id="success" class="success"></p>
    </form>
  `;

  return {
    form: document.getElementById('app-form'),
    error: document.getElementById('error'),
    success: document.getElementById('success')
  };
}
