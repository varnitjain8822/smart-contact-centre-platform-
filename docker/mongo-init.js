// Root + least-privilege app user. Idempotent.
// Fresh volume: run by the mongo entrypoint (already authenticated as root).
// Existing volume / password change: `make mongo-users` (uses the localhost exception when no user exists yet).
const admin = db.getSiblingDB('admin');
const { MONGO_INITDB_ROOT_USERNAME: rootUser, MONGO_INITDB_ROOT_PASSWORD: rootPwd, MONGO_APP_PASSWORD: appPwd } = process.env;
try { admin.auth(rootUser, rootPwd); } catch {
  admin.createUser({ user: rootUser, pwd: rootPwd, roles: ['root'] });
  admin.auth(rootUser, rootPwd);
}
const app = db.getSiblingDB('smartcc');
// dbAdmin: the api's startup index sync creates/drops indexes
const roles = [{ role: 'readWrite', db: 'smartcc' }, { role: 'dbAdmin', db: 'smartcc' }];
if (app.getUser('smartcc_app')) app.updateUser('smartcc_app', { pwd: appPwd, roles });
else app.createUser({ user: 'smartcc_app', pwd: appPwd, roles });
if (app.getUser('smartcc')) app.dropUser('smartcc');   // pre-rename app user
print('mongo users ok');
