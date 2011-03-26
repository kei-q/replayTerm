require 'json'

def encode_vt100(text)
  pos = 0
  result = ""
  while pos < text.length do
    case text[pos]
    when "\b"
      result += "?"
    when "\r"
      result += "R"
    when "\n"
      result += "N"
    when "\e"
      if text[pos+1] == "["
        result += "E"
        pos += 1
      else
        result += text[pos]
      end
    else
      result += text[pos]
    end
    pos += 1
  end
  result 
end

result = []
File.open('ttyrecord') do |f|
  until f.eof? do
    header = f.read(4*3).unpack('LLi')
    #print header
    #puts
    contents = f.read(header[2])
    result << {time: header[0], contents:contents}
    # p encode_vt100(contents)
  end
end

print JSON.pretty_generate(result)



