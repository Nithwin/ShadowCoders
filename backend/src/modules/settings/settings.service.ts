import * as authRepo from '../auth/auth.repo';

export const getSettings = async (userId: string) => {
  const user = await authRepo.findUserById(userId);
  if (!user) {
    throw { status: 404, message: 'User not found' };
  }
  return user.settings || {};
};

export const updateSettings = async (userId: string, settings: any) => {
  // Merge existing settings with new settings
  const user = await authRepo.findUserById(userId);
  if (!user) {
    throw { status: 404, message: 'User not found' };
  }

  const currentSettings = (user.settings as Record<string, any>) || {};
  const newSettings = { ...currentSettings, ...settings };

  return authRepo.updateUser(userId, { settings: newSettings });
};
