/** Single source for the public contact details shown on home and in the footer. */
export const contact = {
  email: 'arimoweb@gmail.com',
  linkedinUrl: 'https://www.linkedin.com/in/ariana-andreina-mora',
};

/** Pre-fills the subject so inquiries are easy to spot in the inbox. */
export const contactMailto = `mailto:${contact.email}?subject=${encodeURIComponent('Project inquiry')}`;
