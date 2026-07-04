import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";

export function ComplianceSettings(){
    const user = useAuth((s) => s.user);
    const navigate = useNavigate();

    if (!user) return null;

    return (
        <div className="max-w-3xl space-y-5">
            <div>
                <h1 className="text-xl sm:text-2xl font-bold">My Profile</h1>
                <p className="text-sm text-text-muted mt-0.5">Your account profile and security</p>
            </div>

            {/* Profile card */}
            <div className="card p-6 flex items-center gap-5">
                <div className="w-16 h-16 rounded-xl bg-primary-bg flex items-center justify-center font-bold text-xl text-primary-on-bg shrink-0">
                    {user.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="text-lg font-semibold truncate">{user.name}</div>
                    <div className="text-sm text-text-muted truncate mt-0.5">{user.email}</div>
                </div>
            </div>

            {/* Security card */}
            <div className="card p-6">
                <div className="flex items-start gap-4 mb-5">
                    <div className="w-10 h-10 rounded-lg bg-surface2 flex items-center justify-center shrink-0">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
                            <rect x="3" y="11" width="18" height="11" rx="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                    </div>
                    <div>
                        <div className="font-semibold text-base">Security</div>
                        <p className="text-sm text-text-muted mt-0.5">Manage your account password and login access.</p>
                    </div>
                </div>
                <button
                    type="button"
                    className="btn-outline"
                    onClick={() => navigate('/change-password')}
                >
                    Change Password
                </button>
            </div>
        </div>
    );
}