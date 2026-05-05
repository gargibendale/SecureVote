import uuid

# Generate a random UUID (Version 4)
my_uuid = uuid.uuid4()

# Print the UUID object
print(f"UUID Object: {my_uuid}")

# Convert the UUID to a standard 36-character string with hyphens
my_uuid_string = str(my_uuid)
print(f"UUID String (standard): {my_uuid_string}")
