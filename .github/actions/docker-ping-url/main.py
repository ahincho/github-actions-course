import os
import requests
import time

def set_output(file_path, name, value):
  with open(file_path, "a") as file:
    file.write(f"{name}={value}\n")

def ping(url, max_free_trials=10, delay=5):
  trials = 0
  while trials < max_free_trials:
    try:
      response = requests.get(url)
      if response.status_code == 200:
        print(f"Website {url} is reachable.")
        return True
    except requests.RequestException as re:
      print(f"Attempt {trials + 1} failed: {re}")
      time.sleep(delay)
    except requests.exceptions.MissingSchema as ms:
      print(f"Invalid URL schema: {ms}")
      return False
    trials += 1
  return False

def run():
  url = os.getenv("INPUT_URL", "http://example.com")
  max_free_trials = int(os.getenv("INPUT_MAX-FREE-TRIALS", "10"))
  delay = int(os.getenv("INPUT_DELAY", "5"))
  is_reachable = ping(url, max_free_trials, delay)
  set_output(os.getenv("GITHUB_OUTPUT"), "success", str(is_reachable).lower())
  if not is_reachable:
    raise Exception(f"Website {url} is not reachable after {max_free_trials} attempts.")
  print(f"Website {url} is reachable after {max_free_trials} attempts.")

if __name__ == "__main__":
  run()
