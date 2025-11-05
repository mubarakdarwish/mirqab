import { Injectable, signal, computed, inject } from '@angular/core';
import { auth, db } from '../firebase.config';
import type { SectorType } from '../app.component';

export type Role = 'admin' | 'inspector' | 'head_of_section' | 'data_entry' | 'laboratory';

export interface UserPermissions {
  allowedPorts: string[];
  allowedSectors: SectorType[];
}

export interface User {
  uid: string; // Firebase Auth UID
  email: string;
  name: string;
  civilId: string;
  phone: string;
  jobTitle: string;
  roles: Role[];
  permissions: UserPermissions;
  hasChangedDefaultPassword?: boolean;
  laboratoryName?: string; // Link to laboratory name
}


@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly usersState = signal<User[]>([]);
  private readonly currentUserState = signal<User | null>(null);
  private readonly activeRoleState = signal<Role | null>(null);
  
  public readonly isInitialSetupNeeded = signal<boolean>(false);

  public readonly users = this.usersState.asReadonly();
  public readonly currentUser = this.currentUserState.asReadonly();
  public readonly activeRole = this.activeRoleState.asReadonly();

  public readonly inspectors = computed(() =>
    this.users().filter(u => u.roles.includes('inspector'))
  );

  constructor() {
    // Listen to all users in real-time
    db.collection('users').onSnapshot((snapshot) => {
      this.isInitialSetupNeeded.set(snapshot.empty);
      const users = snapshot.docs.map(doc => doc.data() as User);
      this.usersState.set(users.sort((a,b) => a.name.localeCompare(b.name)));
    });

    // Listen to authentication state changes
    auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await db.collection('users').doc(firebaseUser.uid).get();
        if (userDoc.exists) {
          this.currentUserState.set(userDoc.data() as User);
        } else {
          // User exists in Auth but not in Firestore, something is wrong. Log them out.
          this.logout();
        }
      } else {
        this.currentUserState.set(null);
        this.activeRoleState.set(null);
      }
    });
  }

  async login(email: string, password_input: string): Promise<User | null> {
    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password_input);
      if (userCredential.user) {
        const userDoc = await db.collection('users').doc(userCredential.user.uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data() as User;
          this.currentUserState.set(userData);
          return userData;
        }
      }
      return null;
    } catch (error) {
      console.error("Login error:", error);
      return null;
    }
  }

  async logout(): Promise<void> {
    await auth.signOut();
    this.currentUserState.set(null);
    this.activeRoleState.set(null);
  }

  setActiveRole(role: Role | null): void {
    this.activeRoleState.set(role);
  }

  async changePassword(newPassword: string): Promise<boolean> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser || !this.currentUser()) return false;

    try {
      await firebaseUser.updatePassword(newPassword);
      const userRef = db.collection('users').doc(firebaseUser.uid);
      await userRef.update({ hasChangedDefaultPassword: true });
      this.currentUserState.update(user => user ? { ...user, hasChangedDefaultPassword: true } : null);
      return true;
    } catch (error) {
      console.error("Password change error:", error);
      return false;
    }
  }
  
  async addUser(userData: Omit<User, 'uid' | 'hasChangedDefaultPassword'>): Promise<{ success: boolean; error?: string }> {
     if (this.usersState().some(u => u.email.trim().toLowerCase() === userData.email.trim().toLowerCase())) {
      return { success: false, error: 'البريد الإلكتروني موجود بالفعل.' };
    }
     if (this.usersState().some(u => u.civilId.trim() === userData.civilId.trim())) {
       return { success: false, error: 'الرقم المدني موجود بالفعل.' };
    }
    
    try {
      // Step 1: Create user in Firebase Auth
      const userCredential = await auth.createUserWithEmailAndPassword(userData.email, '20252025');
      const firebaseUser = userCredential.user;

      if (firebaseUser) {
        // Step 2: Create user document in Firestore
        const newUser: User = {
          ...userData,
          uid: firebaseUser.uid,
          hasChangedDefaultPassword: false,
        };
        await db.collection('users').doc(firebaseUser.uid).set(newUser);
        return { success: true };
      }
      return { success: false, error: 'Failed to create user account.' };
    } catch (error: any) {
      console.error("Add user error:", error);
      if (error.code === 'auth/email-already-in-use') {
        return { success: false, error: 'هذا البريد الإلكتروني مستخدم بالفعل من قبل حساب آخر.' };
      }
      return { success: false, error: error.message };
    }
  }

  async deleteUser(uid: string): Promise<void> {
    if (this.currentUser()?.uid === uid) {
      alert('لا يمكن حذف المستخدم الحالي.');
      return;
    }
    // Note: Deleting a user from Firebase Auth is a privileged operation
    // and should typically be done from a backend/cloud function.
    // Here, we only delete the Firestore document.
    await db.collection("users").doc(uid).delete();
  }
  
  async updateUser(uid: string, updatedUserData: Partial<User>): Promise<void> {
    const userRef = db.collection("users").doc(uid);
    await userRef.update(updatedUserData);
  }
}