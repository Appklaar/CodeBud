// short random string for ids - not guaranteed to be unique
const randomId = function(length = 8) {
  return Math.random().toString(36).substring(2, length + 2);
};

const existing: string[] = [];

const checkId = (id: string) => {
  let match = existing.find((item) => item === id);
  return match ? false : true;
};

// generate a unique id
export const getId = function(length = 8) {
  const limit = 100; // max tries to create unique id
  let attempts = 0; // how many attempts
  let id: string | undefined;

  while(!id && attempts < limit) {
    id = randomId(length); // create id
    if(!checkId(id)) { // check unique
      id = undefined; // reset id
      attempts++; // record failed attempt
    }
  }

  const result = id ?? "defaultId";
  existing.push(result);
  return result;
};