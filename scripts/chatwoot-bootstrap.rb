# Idempotent Chatwoot bootstrap. Run:
#   docker compose exec -T -e CW_ADMIN_EMAIL=… -e CW_ADMIN_PASSWORD=… -e CW_AGENT_EMAIL=… -e CW_AGENT_PASSWORD=… \
#     rails bundle exec rails runner - < scripts/chatwoot-bootstrap.rb
# Prints one JSON line: {"account_id":…,"admin_token":…}
account = Account.find_or_create_by!(name: 'SmartCC')

def ensure_user(email, name, password, account, role)
  u = User.find_or_initialize_by(email: email)
  if u.new_record?
    u.name = name
    u.password = password
    u.skip_confirmation!
    u.save!
  end
  AccountUser.find_or_create_by!(account: account, user: u) { |au| au.role = role }
  u
end

svc = ensure_user(ENV.fetch('CW_ADMIN_EMAIL'), 'Portal Service', ENV.fetch('CW_ADMIN_PASSWORD'), account, :administrator)
ensure_user(ENV.fetch('CW_AGENT_EMAIL'), 'Demo Agent', ENV.fetch('CW_AGENT_PASSWORD'), account, :agent)

{ 'INSTALLATION_NAME' => 'SmartCC', 'BRAND_NAME' => 'SmartCC',
  'CAPTAIN_OPEN_AI_API_KEY' => ENV['GROQ_API_KEY'], 'CAPTAIN_OPEN_AI_ENDPOINT' => 'https://api.groq.com/openai',
  'CAPTAIN_OPEN_AI_MODEL' => ENV.fetch('GROQ_MODEL', 'openai/gpt-oss-120b') }.each do |k, v|
  next if v.blank?

  c = InstallationConfig.find_or_initialize_by(name: k)
  c.value = v
  c.save!
end
GlobalConfig.clear_cache

puts({ account_id: account.id, admin_token: svc.access_token.token }.to_json)
