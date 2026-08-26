import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@petshop.test" },
    update: {},
    create: { name: "Ava Admin", email: "admin@petshop.test", passwordHash, role: "ADMIN" },
  });
  const manager = await prisma.user.upsert({
    where: { email: "manager@petshop.test" },
    update: {},
    create: { name: "Max Manager", email: "manager@petshop.test", passwordHash, role: "MANAGER" },
  });
  const staff = await prisma.user.upsert({
    where: { email: "staff@petshop.test" },
    update: {},
    create: { name: "Sam Staff", email: "staff@petshop.test", passwordHash, role: "STAFF" },
  });

  const categoryNames = ["Dog Food", "Cat Food", "Toys", "Grooming Supplies", "Habitats & Cages", "Health & Wellness"];
  const categories = [];
  for (const name of categoryNames) {
    categories.push(await prisma.category.upsert({ where: { name }, update: {}, create: { name } }));
  }
  const [dogFood, catFood, toys, grooming, habitats, health] = categories;

  const supplierA = await prisma.supplier.create({
    data: { name: "Purrfect Wholesale Co.", contactName: "Dana Lee", email: "orders@purrfectwholesale.test", phone: "555-0101", address: "12 Kibble Way" },
  });
  const supplierB = await prisma.supplier.create({
    data: { name: "Bark & Beyond Distributors", contactName: "Chris Rowe", email: "sales@barkbeyond.test", phone: "555-0102", address: "88 Leash Ave" },
  });

  const productDefs = [
    { sku: "DF-001", name: "Premium Adult Dog Kibble 15kg", categoryId: dogFood.id, supplierId: supplierB.id, costPrice: 28, sellPrice: 49.99, quantity: 40, reorderLevel: 10 },
    { sku: "DF-002", name: "Grain-Free Puppy Food 5kg", categoryId: dogFood.id, supplierId: supplierB.id, costPrice: 18, sellPrice: 32.5, quantity: 25, reorderLevel: 8 },
    { sku: "CF-001", name: "Salmon Cat Food 3kg", categoryId: catFood.id, supplierId: supplierA.id, costPrice: 12, sellPrice: 21.99, quantity: 30, reorderLevel: 10 },
    { sku: "CF-002", name: "Kitten Formula Wet Food (24 pack)", categoryId: catFood.id, supplierId: supplierA.id, costPrice: 15, sellPrice: 27.0, quantity: 4, reorderLevel: 6 },
    { sku: "TY-001", name: "Squeaky Bone Toy", categoryId: toys.id, supplierId: supplierB.id, costPrice: 2, sellPrice: 6.99, quantity: 60, reorderLevel: 15 },
    { sku: "TY-002", name: "Feather Wand Cat Toy", categoryId: toys.id, supplierId: supplierA.id, costPrice: 1.5, sellPrice: 5.5, quantity: 3, reorderLevel: 10 },
    { sku: "GR-001", name: "Deshedding Brush", categoryId: grooming.id, supplierId: supplierA.id, costPrice: 4, sellPrice: 12.99, quantity: 20, reorderLevel: 5 },
    { sku: "GR-002", name: "Oatmeal Pet Shampoo 500ml", categoryId: grooming.id, supplierId: supplierB.id, costPrice: 3.5, sellPrice: 10.5, quantity: 18, reorderLevel: 5 },
    { sku: "HB-001", name: "Small Animal Habitat Kit", categoryId: habitats.id, supplierId: supplierB.id, costPrice: 35, sellPrice: 69.99, quantity: 8, reorderLevel: 3 },
    { sku: "HW-001", name: "Joint Support Chews (60ct)", categoryId: health.id, supplierId: supplierA.id, costPrice: 9, sellPrice: 19.99, quantity: 22, reorderLevel: 6 },
  ];

  const products = [];
  for (const p of productDefs) {
    const product = await prisma.product.create({ data: p });
    products.push(product);
    if (product.quantity > 0) {
      await prisma.stockMovement.create({ data: { productId: product.id, change: product.quantity, reason: "INITIAL_STOCK" } });
    }
  }

  const customerDefs = [
    { name: "Jordan Rivera", email: "jordan.rivera@example.test", phone: "555-1001", address: "45 Maple St" },
    { name: "Priya Nair", email: "priya.nair@example.test", phone: "555-1002", address: "9 Oak Ln" },
    { name: "Liam O'Connell", email: "liam.oconnell@example.test", phone: "555-1003", address: "77 Birch Rd" },
  ];
  const customers = [];
  for (const c of customerDefs) customers.push(await prisma.customer.create({ data: c }));
  const [jordan, priya, liam] = customers;

  const bella = await prisma.pet.create({ data: { customerId: jordan.id, name: "Bella", species: "Dog", breed: "Labrador Retriever", sex: "Female", weightKg: 27.5 } });
  await prisma.pet.create({ data: { customerId: jordan.id, name: "Whiskers", species: "Cat", breed: "Tabby", sex: "Male", weightKg: 4.2 } });
  const luna = await prisma.pet.create({ data: { customerId: priya.id, name: "Luna", species: "Cat", breed: "Siamese", sex: "Female", weightKg: 3.8 } });
  const rocky = await prisma.pet.create({ data: { customerId: liam.id, name: "Rocky", species: "Dog", breed: "Beagle", sex: "Male", weightKg: 12.0 } });

  const serviceDefs = [
    { name: "Basic Grooming", description: "Bath, brush, nail trim", price: 35, durationMin: 45 },
    { name: "Full Grooming Package", description: "Bath, haircut, nail trim, ear cleaning", price: 65, durationMin: 90 },
    { name: "Vaccination Visit", description: "Routine vaccination with vet tech", price: 45, durationMin: 20 },
    { name: "Nail Trim Only", description: "Quick nail trim", price: 12, durationMin: 15 },
  ];
  const services = [];
  for (const s of serviceDefs) services.push(await prisma.service.create({ data: s }));
  const [basicGroom, fullGroom, vaccination] = services;

  // Sample sale
  const kibble = products[0];
  const toy = products[4];
  const saleSubtotal = kibble.sellPrice * 1 + toy.sellPrice * 2;
  await prisma.sale.create({
    data: {
      customerId: jordan.id,
      userId: staff.id,
      paymentMethod: "CARD",
      subtotal: saleSubtotal,
      discount: 0,
      tax: Number((saleSubtotal * 0.08).toFixed(2)),
      total: Number((saleSubtotal * 1.08).toFixed(2)),
      items: {
        create: [
          { productId: kibble.id, quantity: 1, unitPrice: kibble.sellPrice, subtotal: kibble.sellPrice },
          { productId: toy.id, quantity: 2, unitPrice: toy.sellPrice, subtotal: toy.sellPrice * 2 },
        ],
      },
    },
  });
  await prisma.product.update({ where: { id: kibble.id }, data: { quantity: { decrement: 1 } } });
  await prisma.product.update({ where: { id: toy.id }, data: { quantity: { decrement: 2 } } });
  await prisma.stockMovement.createMany({
    data: [
      { productId: kibble.id, change: -1, reason: "SALE" },
      { productId: toy.id, change: -2, reason: "SALE" },
    ],
  });

  // Upcoming appointments
  const in2Days = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const in5Days = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  await prisma.appointment.create({
    data: { customerId: jordan.id, petId: bella.id, serviceId: fullGroom.id, staffId: staff.id, startAt: in2Days, status: "CONFIRMED", notes: "Prefers oatmeal shampoo" },
  });
  await prisma.appointment.create({
    data: { customerId: priya.id, petId: luna.id, serviceId: basicGroom.id, staffId: manager.id, startAt: in5Days, status: "SCHEDULED" },
  });
  await prisma.appointment.create({
    data: { customerId: liam.id, petId: rocky.id, serviceId: vaccination.id, staffId: admin.id, startAt: in5Days, status: "SCHEDULED" },
  });

  console.log("Seed complete.");
  console.log("Demo logins (password: password123):");
  console.log("  admin@petshop.test   (ADMIN)");
  console.log("  manager@petshop.test (MANAGER)");
  console.log("  staff@petshop.test   (STAFF)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
