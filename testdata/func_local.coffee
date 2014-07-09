() ->
	bar = 3

# The problems with this file's output (in func_local.json) are:
#
# * the bar symbol's "ident" property should have value "7-10"; it is null
# * the bar symbol has no "defn" property; it should have defn="0-7"
# * the bar ref has no "span" property; it should have span="7-10"
# * there are 2 refs to bar in span 7-10; should only be 1 (with def=true)