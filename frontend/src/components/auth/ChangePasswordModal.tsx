"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { CheckCircle2, ShieldAlert, Lock } from "lucide-react";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { recordUserAuditLog } from "@/lib/audit";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post("/auth/change-password", {
        old_password: currentPassword,
        new_password: newPassword,
      });

      setSuccess("Password updated successfully.");
      recordUserAuditLog("PASSWORD_CHANGED", "/auth/change-password", {
        timestamp: new Date().toISOString(),
      });
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Failed to update password. Verify your current password and try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title="Change Password"
      subtitle="Update your account security credentials"
      icon={<Lock className="w-5 h-5" />}
      iconVariant="cyan"
      preventBackdropClose={isLoading}
    >
      <form onSubmit={handleSubmit}>
        <ModalBody>
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <div>{success}</div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2.5 px-3.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2.5 px-3.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2.5 px-3.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
              />
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Update Password"
            )}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
