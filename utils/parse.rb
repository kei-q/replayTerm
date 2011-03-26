require 'json'

class Parser
  def parse(s)
    @p = 0
    @s = s
    @result = []
    @buf = ""
    aux()
  end

  def d()
    unless @buf.empty?
      @result << @buf
      @buf = ""
    end
  end

  def e(s, opt = [])
    d()
    @result << [s] + opt
  end

  def succ()
    c = @s[@p]
    @p += 1
    c
  end

  def aux()
    while @p < @s.length
      c = succ()
      case c
      when /[\b\r\n]/
        e(c)
      when "\e"
        cc = succ() # '['
        if cc == '[' then
          if @s[@p..-1] =~ /^([0-9]+)/ then
            arg = $1
            @p += arg.length
            cmd = succ()
            e("CSI #{cmd}", [arg.to_i])
          else
            cmd = succ()
            e("CSI #{cmd}")
          end
        else
          e("#{cc}")
        end
      else
        @buf << c
      end
    end
    @result
  end
end

recordfile = ARGV[0]

result = []
File.open(recordfile) do |f|
  until f.eof? do
    h = f.read(12).unpack('LLi')
    t = h[0] * 1000 + h[1] / 1000
    c = Parser.new.parse(f.read(h[2]))
    result << { time: t,  contents: c}
  end
end

File.open(recordfile+'.json',  'w') do |f|
#  f.puts JSON.pretty_generate(result)
  f.puts JSON.generate(result)
end
