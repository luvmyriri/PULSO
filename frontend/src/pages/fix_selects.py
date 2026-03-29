filepath = r'c:\Apache24\htdocs\PULSO\frontend\src\pages\GovDivisionPage.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Replace lines 716-832 (0-indexed: 715-831) with OrangeSelect components
# These are the status filter + users filters sections

status_filter_line = None
for i, line in enumerate(lines):
    if '/* Status filter' in line:
        status_filter_line = i
        break

record_count_line = None
for i in range(status_filter_line, len(lines)):
    if 'ml-auto' in lines[i] and 'whitespace-nowrap' in lines[i]:
        record_count_line = i
        break

print(f'Replacing lines {status_filter_line+1} to {record_count_line} (exclusive)')
print(f'That means keeping line {record_count_line+1} onwards')

new_lines_block = [
    '                                     {/* Status filter \u2014 for non-user pages */}\r\n',
    '                                     {config.statuses.length > 0 && !isUsers && (\r\n',
    '                                         <OrangeSelect\r\n',
    '                                             value={statusFilter}\r\n',
    '                                             onChange={v => setStatusFilter(v)}\r\n',
    '                                             placeholder="All Statuses"\r\n',
    '                                             minWidth="180px"\r\n',
    '                                             options={[\r\n',
    "                                                 { value: '', label: 'All Statuses' },\r\n",
    "                                                 ...config.statuses.map(s => ({ value: s, label: s.replace(/_/g, ' ').replace(/\\b\\w/g, c => c.toUpperCase()) }))\r\n",
    '                                             ]}\r\n',
    '                                         />\r\n',
    '                                     )}\r\n',
    '\r\n',
    '                                     {/* Users-specific filters */}\r\n',
    '                                     {isUsers && (\r\n',
    '                                         <>\r\n',
    '                                             <OrangeSelect\r\n',
    '                                                 value={roleFilter}\r\n',
    '                                                 onChange={v => setRoleFilter(v)}\r\n',
    '                                                 placeholder="All Roles"\r\n',
    '                                                 minWidth="190px"\r\n',
    '                                                 options={[\r\n',
    "                                                     { value: '', label: 'All Roles' },\r\n",
    '                                                     ...GOV_ROLE_OPTIONS.map(r => ({ value: r, label: toTitleCase(r) }))\r\n',
    '                                                 ]}\r\n',
    '                                             />\r\n',
    '\r\n',
    '                                             <OrangeSelect\r\n',
    '                                                 value={trustFilter}\r\n',
    '                                                 onChange={v => setTrustFilter(v)}\r\n',
    '                                                 placeholder="All Trust Scores"\r\n',
    '                                                 minWidth="175px"\r\n',
    '                                                 options={[\r\n',
    "                                                     { value: '', label: 'All Trust Scores' },\r\n",
    "                                                     { value: '100', label: 'Perfect (100)' },\r\n",
    "                                                     { value: '90',  label: 'High (90\u201399)' },\r\n",
    "                                                     { value: '70',  label: 'Medium (70\u201389)' },\r\n",
    "                                                     { value: 'low', label: 'Low (<70)' },\r\n",
    '                                                 ]}\r\n',
    '                                             />\r\n',
    '\r\n',
    '                                             {activeFilterCount > 0 && (\r\n',
    '                                                 <button\r\n',
    "                                                     onClick={() => { setRoleFilter(''); setTrustFilter(''); setSearch(''); }}\r\n",
    '                                                     className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-xs font-bold border border-orange-200 dark:border-orange-800 hover:bg-orange-100 transition-colors whitespace-nowrap"\r\n',
    '                                                 >\r\n',
    '                                                     <Filter size={11} />\r\n',
    "                                                     {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active \u00b7 clear\r\n",
    '                                                 </button>\r\n',
    '                                             )}\r\n',
    '                                         </>\r\n',
    '                                     )}\r\n',
    '\r\n',
]

new_lines = lines[:status_filter_line] + new_lines_block + lines[record_count_line:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f'Done! Replaced {record_count_line - status_filter_line} lines with {len(new_lines_block)} clean lines.')
print(f'New file has {len(new_lines)} lines.')
