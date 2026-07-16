// Developer / technical support contact. Shown so GAPOKTAN admins know who to
// reach for help or updates.
export const DEVELOPER = {
  name: 'Mohammed AL-Shujaa',
  role: 'Developer',
  phone: '082123141973',
  whatsapp: '6282123141973', // 08.. -> 628.. for wa.me links
  email: 'mg.shujaa@gmail.com',
}

// A user counts as the developer if their email matches or their name contains "shujaa".
export function isDeveloper(u?: { email?: string | null; name?: string | null } | null): boolean {
  if (!u) return false
  const email = (u.email || '').toLowerCase()
  const name = (u.name || '').toLowerCase()
  return email === DEVELOPER.email.toLowerCase() || name.includes('shujaa')
}
