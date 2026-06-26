function getCookie(name) {
  const found = document.cookie.split('; ').find((item) => item.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.split('=')[1]) : '';
}

export async function bootstrapCsrfToken() {
  await fetch('/api/auth/csrf-token', {
    method: 'GET',
    credentials: 'include'
  });
}

export async function request(url, method, payload) {
  if (method !== 'GET') {
    await bootstrapCsrfToken();
  }

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': getCookie('csrf_token')
    },
    credentials: 'include',
    body: payload ? JSON.stringify(payload) : undefined
  });

  const body = await response.json();
  if (!body.success) {
    throw new Error(body.error?.message || 'Request failed');
  }

  return body.data;
}

export function valuesFromForm(form) {
  const data = new FormData(form);
  const out = {};
  for (const [key, value] of data.entries()) {
    out[key] = value;
  }

  for (const input of form.querySelectorAll('input[type="checkbox"]')) {
    out[input.name] = input.checked;
  }

  return out;
}
