export const COMPANIES = [
  {
    id: 'pacific',
    name: 'Pacific Printing',
    shortName: 'PACIFIC',
    logo: '/logos/pacific-printing.png', // Placeholder, using generate_image later or user provides
    address: '1445 Monterey Hwy\nSan Jose CA 95110',
    phone: '(408) 293-8083',
    email: 'orders@pacificprinting.com',
    website: 'www.pacificprinting.com',
    taxRate: 0.09375, // Sample San Jose tax rate
  },
  {
    id: 'sanjosemailing',
    name: 'San Jose Mailing',
    shortName: 'SAN JOSE MAILING',
    logo: '/logos/sj-mailing.png',
    address: '1445 Monterey Hwy\nSan Jose CA 95110',
    phone: '(408) 293-8083',
    email: 'orders@sanjosemailing.com',
    taxRate: 0, // Mailing services might be non-taxable
  },
  {
    id: 'papyrus',
    name: 'Papyrus',
    shortName: 'PAPYRUS',
    logo: '/logos/papyrus.png',
    address: '1445 Monterey Hwy\nSan Jose CA 95110',
    phone: '(408) 293-8083',
    taxRate: 0.09125,
  },
  {
    id: 'printedunion',
    name: 'Printed Union',
    shortName: 'PRINTED UNION',
    logo: '/logos/printed-union.png',
    address: '1445 Monterey Hwy\nSan Jose CA 95110',
    taxRate: 0.09125,
  }
];

export function getCompanyById(id: string) {
  return COMPANIES.find(c => c.id === id) || COMPANIES[0];
}
