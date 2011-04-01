require 'sinatra'

get '/' do
  slim :show
end

get '/:record' do
  @record = params[:record]
  slim :show
end
