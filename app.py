import sys
import face_recognition
import os
from PIL import Image

def check_image_with_pil(path):
    try:
        Image.open(path)
    except IOError:
       return False
    except OSError:
        return False
    return True


file_type = str(sys.argv[1])
num_faces = int(sys.argv[2])

if file_type == "png":
    if check_image_with_pil("candidate.png"):
        im = Image.open("candidate.png")
        rgb_im = im.convert("RGB")
        rgb_im.save("candidate.jpg")
        os.remove("candidate.png")
    else:
        print("false")
        sys.stdout.flush()
        sys.exit()

seed_location = 'seed.jpg'
candidate_location = 'candidate.jpg'
check_candidate = check_image_with_pil(candidate_location)

if check_candidate == True:
    candidate_image = face_recognition.load_image_file(candidate_location)
    face_locations = face_recognition.face_locations(candidate_image)
    number_of_faces = len(face_locations)

    if number_of_faces > num_faces:
        print("false")
        sys.stdout.flush()
    else:
        seed_image = face_recognition.load_image_file(seed_location)
        seed_image_encoding = face_recognition.face_encodings(seed_image)[0]
        candidate_image_encoding = face_recognition.face_encodings(candidate_image)

        if len(candidate_image_encoding) > 0:
            results = face_recognition.compare_faces([candidate_image_encoding[0]], seed_image_encoding)

            if results[0]:
                print("true")
                sys.stdout.flush()
            else:
                print("false")
                sys.stdout.flush()

        else:
            print("false")
            sys.stdout.flush()
else:
    print("false")
    sys.stdout.flush()