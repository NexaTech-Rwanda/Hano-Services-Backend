import pool from '../config/database';

async function seed() {
  try {
    console.log('Seeding database...');

    // Seed service categories
    const categories = [
      { name: 'Plumbing', description: 'Plumbing services and repairs' },
      { name: 'Electrical', description: 'Electrical installation and repairs' },
      { name: 'Carpentry', description: 'Carpentry and woodworking services' },
      { name: 'Cleaning', description: 'House and office cleaning services' },
      { name: 'Tailoring', description: 'Tailoring and clothing services' },
      { name: 'Beauty & Hair', description: 'Beauty and hair styling services' },
      { name: 'Babysitting', description: 'Childcare and babysitting services' },
      { name: 'Gardening', description: 'Gardening and landscaping services' },
      { name: 'Painting', description: 'Painting and decoration services' },
    ];

    for (const category of categories) {
      await pool.query(
        'INSERT INTO service_categories (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
        [category.name, category.description]
      );
    }

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
