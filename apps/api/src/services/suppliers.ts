import { eq } from 'drizzle-orm';
import { db } from '../database/client';
import { suppliers } from '../database/schema';

export type Supplier = {
  id: string;
  name: string;
  contactName?: string;
  email: string;
  phone?: string;
  address?: string;
};

export type CreateSupplierInput = {
  name: string;
  contactName?: string;
  email: string;
  phone?: string;
  address?: string;
};

export type UpdateSupplierInput = {
  name?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
};

export async function listSuppliers(search?: string): Promise<Supplier[]> {
  const condition = search ? eq(suppliers.name, search) : undefined;
  return db.select().from(suppliers).where(condition).orderBy(suppliers.name);
}

export async function getSupplier(id: string): Promise<Supplier | undefined> {
  const [row] = await db.select().from(suppliers).where(eq(suppliers.id, id));
  return row || undefined;
}

export async function createSupplier(input: CreateSupplierInput): Promise<Supplier> {
  const id = crypto.randomUUID();
  await db.insert(suppliers).values({
    id,
    name: input.name,
    contactName: input.contactName,
    email: input.email,
    phone: input.phone,
    address: input.address,
  });
  const row = await db.select().from(suppliers).where(eq(suppliers.id, id));
  if (row.length === 0) throw new Error('Supplier creation failed');
  return row[0];
}

export async function updateSupplier(id: string, input: UpdateSupplierInput): Promise<Supplier | undefined> {
  await db.update(suppliers)
    .set({
      name: input.name,
      contactName: input.contactName,
      email: input.email,
      phone: input.phone,
      address: input.address,
    })
    .where(eq(suppliers.id, id));
  return getSupplier(id);
}

export async function deleteSupplier(id: string): Promise<boolean> {
  const [row] = await db.delete(suppliers).where(eq(suppliers.id, id));
  return !!row;
}