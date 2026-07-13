interface SearchInputProps {
  value: string
  onChange: (value: string) => void
}

export const SearchInput = ({ value, onChange }: SearchInputProps) => {
  return (
    <label className="search-field">
      <span>Search players</span>
      <input
        type="search"
        value={value}
        placeholder="Search by name, country, or role"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}
