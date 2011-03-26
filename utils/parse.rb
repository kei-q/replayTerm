require 'json'

class Parser
  def parse(s)
    @p = 0
    @s = s
    @result = []
    @buf = ""
    parse_C0()
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

  def parse_C0()
    while @p < @s.length
      c = succ()
      case c
      when /[\b\r\n]/
        e("C0 #{c}")
      when "\e"
        parse_C1()
      else
        @buf << c
      end
    end
    @result
  end

  def parse_C1()
    cc = succ()
    if cc == '[' then
      parse_CSI()
    else
      e("C1 #{cc}")
    end
  end

  def parse_CSI()
    s = @s[@p..-1]
    if s =~ /^\d/ then
      ep = s =~ /[^\d;]/
      arg = s[0..ep-1].split(';')
      @p += ep
      cmd = succ()
      e("CSI #{cmd}", arg)
    else
      cmd = succ()
      e("CSI #{cmd}")
    end
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
  f.puts JSON.pretty_generate(result)
#  f.puts JSON.generate(result)
end
