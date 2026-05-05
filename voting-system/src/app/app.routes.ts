import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Signup } from './signup/signup';
import { Login } from './login/login';
import { Profile } from './profile/profile';
import { authGuard } from './auth.guard';
import { VerifyAadhaar } from './verify-aadhaar/verify-aadhaar';
import { Biometrics } from './biometrics/biometrics';
import { VoterCredentials } from './voter-credentials/voter-credentials';
import { Elections } from './elections/elections';
import { AdminConsole } from './admin-console/admin-console';
import { Results } from './results/results';
import { roleGuard } from './role.guard';
import { UserRole } from './user';
import { Dashboard } from './dashboard/dashboard';
import { ElectionDetails } from './election-details/election-details';
import { VoteComponent } from './vote-component/vote-component';

export const routes: Routes = [
    {
        path: '',
        component: Home,
        title: 'Home page',
    },

    {
        path: 'signup',
        component: Signup,
        title: 'Sign Up'
    },
    {
        path: 'login',
        component: Login,
        title: 'Log In'
    },
    {
        path: 'profile',
        component: Profile,
        title: 'User Profile',
        canActivate: [authGuard]
    },

    {
        path: 'verify-aadhaar',
        component: VerifyAadhaar,
        title: 'Verify Aadhaar',
        canActivate: [authGuard]
    },

    {
        path: 'biometrics',
        component: Biometrics,
        title: 'Submit Biometrics',
        canActivate: [authGuard]
    },

    {
        path: 'voter-credentials',
        component: VoterCredentials,
        title: 'Get Voter Credentials',
        canActivate: [authGuard]
    },

    {
        path: 'elections',
        component: Elections,
        title: 'Elections Page',
        canActivate: [authGuard]
    },

    {
        path: 'admin-console',
        component: AdminConsole,
        title: 'Manage Elections',
        canActivate: [authGuard, roleGuard([UserRole.ADMIN])]
    },

    {
        path: 'results/:id',
        component: Results,
        title: 'View Results',
        canActivate: [authGuard]
    },

    {
        path: 'dashboard',
        component: Dashboard,
        title: 'Dashboard',
        canActivate: [authGuard, roleGuard([UserRole.ADMIN])]
    },

    {
        path: 'election-details/:id',
        component: ElectionDetails,
        title: 'Election Details',
        canActivate: [authGuard]
    },

    {
        path: 'vote/:electionId',
        component: VoteComponent,
        title: 'Vote',
        canActivate: [authGuard]
    }

];
