
load 'deploy' if respond_to?(:namespace)

set :application, "foosboard"
set :user,        "slloyd"
set :deploy_to,   "/var/www/foosboard.soundhacks.com"
set :use_sudo,    false
set :scm,         :git
set :repository,  "git@github.com:repeatingbeats/foosboard.git"
set :deploy_via,  :remote_cache
set :branch,      "master"

set :ssh_options, { :forward_agent => true,
                    :keys => "~/.ssh/id_rsa"
                  }

task :soundhacks do
  role :app, "foosboard.soundhacks.com"
  role :web, "foosboard.soundhacks.com" 
  role :db,  "foosboard.soundhacks.com", :primary => true
end

namespace :deploy do

  task :restart do
    # TODO: need some upstart goodness
  end
end
