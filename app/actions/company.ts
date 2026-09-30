'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().min(2, 'Company name is required'),
  domain: z.string().min(1, 'Domain is required'),
});

export async function signUpCompanyAction(formData: FormData) {
  const emailRaw = formData.get('email') as string;
  const passwordRaw = formData.get('password') as string;
  const nameRaw = formData.get('name') as string;
  const domainRaw = formData.get('domain') as string;

  if (!emailRaw || !passwordRaw || !nameRaw || !domainRaw) {
    throw new Error('All fields are required');
  }

  const parseResult = signupSchema.safeParse({
    email: emailRaw,
    password: passwordRaw,
    name: nameRaw,
    domain: domainRaw,
  });

  if (!parseResult.success) {
    // Return the first validation error message
    throw new Error(parseResult.error.issues[0].message);
  }

  const { email, password, name, domain } = parseResult.data;

  const supabase = await createClient();
  const supabaseAdmin = await createAdminClient();

  // 1. Sign up the user via Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError || !authData.user) {
    console.error('Auth error:', authError);
    throw new Error('Failed to create company account.');
  }

  // 2. Insert into the companies table using Admin client
  // since the user might not be fully signed in context yet depending on email confirmation settings
  // or because they need to populate their profile. Wait, RLS allows insert if auth.uid() = id?
  // Actually, companies table RLS:
  // CREATE POLICY "Companies can view own profile" ON companies FOR SELECT USING (auth.uid() = id);
  // CREATE POLICY "Companies can update own profile" ON companies FOR UPDATE USING (auth.uid() = id);
  // Wait, there is no INSERT policy for companies in the initial schema!
  
  const { error: insertError } = await supabaseAdmin.from('companies').insert({
    id: authData.user.id,
    name,
    domains_hiring: [domain],
    billing_phase: 'success_fee' // Phase 1 default
  });

  if (insertError) {
    console.error('Insert error:', insertError);
    throw new Error('Failed to create company profile.');
  }

  redirect('/shortlist'); // Redirect to company dashboard (built in Step D5)
}
