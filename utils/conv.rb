require 'json'

result = []
File.open(ARGV[0]) do |f|
  until f.eof? do
    header = f.read(4*3).unpack('LLi')
    contents = f.read(header[2])
    result << {time: header[0], contents:contents.force_encoding('UTF-8')}
  end
end

print JSON.generate(result)



