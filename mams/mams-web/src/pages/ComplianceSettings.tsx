import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";

export function ComplianceSettings(){
    const user = useAuth((s) => s.user);
    const navigate = useNavigate();

    if (!user) return null;

    return (
        <div className="max-w-lg space-y-6">
            <div>
                <h1 className="text-2x1 font-bold">Settings</h1>
                <p className="text-sm text-text-muted mt-1">Your account profile and security</p>
            </div>

            <div className="card p-5 space-y-4">
                <h2 className="text-base font-semibold">Profile</h2>
                <div className="grid gap-3">
                    <div>
                        <div className="text-xsx text-text-muted mb-1">Full name</div>
                        <div className="text-sm font-medium">{user.name}</div>
                    </div>

                    <div>
                        <div className="text-xs text-text-muted mb-1">Email</div>
                        <div className="text-sm font-medium">{user.email}</div>
                    </div>

                    <div>
                        <div className="text-xs text-text-muted mb-1">Role</div>
                        <div className="text-sm font-medium capitalize">{user.role.replace(/_/g,' ')}</div>
                    </div>

                </div>
            </div>

            <div className="card p-5 space-y-3">
                <h2 className="text-base font-semibold">Security</h2>
                <p className="text-sm text-text-muted">Update your acoount password.</p>
                <button
                    type="button"
                    className="btn-outline btn-sm"
                    onClick={() => navigate('/change-password')}
                > Change Password
                </button>

            </div>

        </div>
    );

}
