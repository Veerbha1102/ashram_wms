import { createClient } from '@/lib/supabase';

export interface AuthUser {
    id: string;
    email: string;
    role: string;
    full_name: string;
    is_active: boolean;
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string) {
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error('Sign-in error:', error);
        throw new Error(error.message || 'Failed to sign in');
    }

    return data;
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string) {
    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
        console.error('Password reset error:', error);
        throw new Error(error.message || 'Failed to send password reset email');
    }
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string) {
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
        password: newPassword,
    });

    if (error) {
        console.error('Password update error:', error);
        throw new Error(error.message || 'Failed to update password');
    }
}

/**
 * Check if user's email is authorized
 */
export async function checkAuthorization(email: string): Promise<AuthUser | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('authorized_users')
        .select('*')
        .eq('gmail', email)
        .single();

    if (error || !data) {
        console.error('Authorization check failed:', error);
        return null;
    }

    if (!data.is_active) {
        throw new Error('Your account has been deactivated. Please contact the administrator.');
    }

    return {
        id: data.id,
        email: data.gmail,
        role: data.role,
        full_name: data.full_name,
        is_active: data.is_active,
    };
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(email: string) {
    const supabase = createClient();

    await supabase
        .from('authorized_users')
        .update({ last_login: new Date().toISOString() })
        .eq('gmail', email);
}

/**
 * Sign out current user
 */
export async function signOut() {
    const supabase = createClient();

    // Clear localStorage
    localStorage.removeItem('aakb_user_role');
    localStorage.removeItem('aakb_user_name');
    localStorage.removeItem('aakb_user_email');

    const { error } = await supabase.auth.signOut();

    if (error) {
        console.error('Sign out error:', error);
        throw new Error('Failed to sign out');
    }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
    const supabase = createClient();

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user?.email) {
        return null;
    }

    return await checkAuthorization(user.email);
}

/**
 * Check if user has required role
 */
export function hasRole(userRole: string, requiredRoles: string[]): boolean {
    return requiredRoles.includes(userRole);
}

/**
 * Invite a new user (Admin only)
 * This creates a Supabase Auth user and sends invitation email
 */
export async function inviteUser(email: string, fullName: string, role: string) {
    const supabase = createClient();

    // Note: This requires admin privileges in Supabase
    // You'll need to call this from a server-side API route
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
            full_name: fullName,
            role: role,
        },
        redirectTo: `${window.location.origin}/auth/set-password`,
    });

    if (error) {
        console.error('Invite user error:', error);
        throw new Error(error.message || 'Failed to invite user');
    }

    return data;
}
