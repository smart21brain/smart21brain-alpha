/* Smart21Brain — anatomy-photos.js
   Labelled anatomy pictures for the Anatomy & Physiology course.
   Each picture: file, title, a short caption, and its labels.
   A label is [name, x, y, side, description] where x and y are fractions
   (0 to 1) of the picture's width and height, and side is where the name tag
   sits next to the pin: l (left), r (right), t (top), b (bottom).
   lesson-rich.js shows them with {{photo heart}} and anatomy-viewer.js opens
   them full screen when the reader taps a picture. */
window.S21_ANAT = {
  eye: {
    title: 'The eye (side cross-section)', ratio: 1856 / 2304,
    caption: 'The eyeball cut in half, seen from the side. Light enters at the left and the optic nerve leaves at the right.',
    labels: [
      ['Cornea', 0.19, 0.45, 'l', 'The clear front window of the eye. It does most of the focusing of light.'],
      ['Iris', 0.283, 0.445, 't', 'The coloured ring of muscle that widens or narrows the pupil.'],
      ['Pupil', 0.285, 0.50, 'b', 'The opening in the iris that lets light in.'],
      ['Lens', 0.375, 0.50, 'r', 'A clear disc that changes shape to fine-tune focus (accommodation).'],
      ['Ciliary body', 0.345, 0.37, 'r', 'Muscle ring that pulls on the lens and makes the watery fluid at the front of the eye.'],
      ['Vitreous body', 0.53, 0.58, 'r', 'The clear jelly that fills the large chamber behind the lens and holds the retina in place.'],
      ['Retina', 0.49, 0.43, 'r', 'The light-sensing layer at the back of the eye. Rods and cones turn light into nerve signals.'],
      ['Sclera', 0.45, 0.745, 'b', 'The tough white outer wall that protects the eye and keeps its shape.'],
      ['Optic disc', 0.76, 0.50, 'b', 'Where the nerve fibres leave the eye. It has no light receptors, so it is the blind spot.'],
      ['Optic nerve', 0.91, 0.55, 'b', 'Carries the signals from the retina to the visual areas of the brain.'],
      ['Extraocular muscle', 0.80, 0.315, 'l', 'One of the six muscles that move the eyeball up, down and sideways.']
    ]
  },
  ear: {
    title: 'The ear (outer, middle and inner)', ratio: 1856 / 2304,
    caption: 'A cross-section of the ear. Sound travels from the outer ear on the left to the cochlea on the right.',
    labels: [
      ['Pinna (auricle)', 0.10, 0.45, 'r', 'The visible outer ear. It collects sound and guides it into the ear canal.'],
      ['Ear canal', 0.45, 0.55, 'b', 'The tube that carries sound waves to the eardrum.'],
      ['Eardrum', 0.617, 0.52, 'b', 'The tympanic membrane. It vibrates when sound hits it.'],
      ['Ossicles', 0.60, 0.45, 't', 'Three tiny bones (malleus, incus, stapes) that pass the vibrations on and make them stronger.'],
      ['Mastoid air cells', 0.45, 0.42, 't', 'Air-filled spaces in the bone behind the ear.'],
      ['Semicircular canals', 0.725, 0.375, 't', 'Three fluid-filled loops that sense head movement and help with balance.'],
      ['Cochlea', 0.817, 0.50, 'b', 'The snail-shaped organ of hearing. Hair cells inside turn vibrations into nerve signals.'],
      ['Cochlear nerve', 0.917, 0.40, 'l', 'Carries hearing (and balance) signals to the brain.'],
      ['Eustachian tube', 0.79, 0.66, 'l', 'Joins the middle ear to the throat and evens out air pressure on both sides of the eardrum.']
    ]
  },
  capillaries: {
    title: 'Artery, capillary bed and vein', ratio: 1856 / 2304,
    caption: 'Blood leaves the heart in an artery (red), passes through a net of tiny capillaries and returns in a vein (blue).',
    labels: [
      ['Artery', 0.11, 0.50, 'r', 'Carries oxygen-rich blood away from the heart. It has a thick, muscular wall.'],
      ['Red blood cell', 0.157, 0.27, 'r', 'A disc-shaped cell full of haemoglobin that carries oxygen.'],
      ['Arteriole', 0.26, 0.43, 't', 'A small artery that controls how much blood enters a capillary bed.'],
      ['Capillary bed', 0.50, 0.54, 'b', 'A net of very thin vessels where oxygen, nutrients and waste pass between blood and tissue.'],
      ['Venule', 0.73, 0.52, 'b', 'A small vein that collects blood from the capillaries.'],
      ['Vein', 0.85, 0.18, 'l', 'Carries blood back towards the heart. It has thin walls and valves.']
    ]
  },
  brain: {
    title: 'The brain and skull (side view)', ratio: 1856 / 2304,
    caption: 'The brain inside the head, seen from the left. The face points to the left.',
    labels: [
      ['Frontal lobe', 0.27, 0.33, 'r', 'Planning, decisions, speech and voluntary movement.'],
      ['Parietal lobe', 0.583, 0.215, 't', 'Touch, body position and spatial awareness.'],
      ['Occipital lobe', 0.817, 0.40, 'l', 'Processes what we see.'],
      ['Temporal lobe', 0.55, 0.47, 'b', 'Hearing, memory and understanding language.'],
      ['Cerebellum', 0.717, 0.557, 'b', 'Coordinates movement, balance and posture.'],
      ['Brainstem', 0.558, 0.645, 'l', 'Controls breathing, heart rate and wakefulness. It joins the brain to the spinal cord.'],
      ['Spinal cord', 0.63, 0.80, 'r', 'The bundle of nerves running down the back that carries signals to and from the brain.'],
      ['Cervical vertebrae', 0.54, 0.87, 'r', 'The seven neck bones that protect the top of the spinal cord.'],
      ['Skull', 0.88, 0.28, 'l', 'The bony case that protects the brain.'],
      ['Mandible', 0.18, 0.87, 'r', 'The lower jaw, the only moving bone of the skull.']
    ]
  },
  female: {
    title: 'Female reproductive system', ratio: 1856 / 2304,
    caption: 'The female reproductive organs in the pelvis, seen from the front.',
    labels: [
      ['Lumbar vertebrae', 0.50, 0.175, 'r', 'The lower-back bones of the spine.'],
      ['Pelvis (hip bone)', 0.17, 0.32, 'r', 'The bony basin that holds and protects the pelvic organs.'],
      ['Uterine tube', 0.29, 0.385, 'l', 'The fallopian tube. It catches the egg and carries it to the uterus. Fertilisation usually happens here.'],
      ['Ovary', 0.325, 0.456, 'l', 'Makes eggs and the hormones oestrogen and progesterone.'],
      ['Uterus', 0.50, 0.42, 't', 'The muscular organ where a baby grows during pregnancy.'],
      ['Endometrium', 0.50, 0.50, 'r', 'The inner lining of the uterus. It thickens each month and is shed in the period.'],
      ['Cervix', 0.50, 0.58, 'l', 'The narrow lower end of the uterus that opens into the vagina.'],
      ['Vagina', 0.50, 0.645, 'r', 'The muscular canal from the cervix to the outside of the body.'],
      ['Hip joint', 0.24, 0.54, 'l', 'Where the head of the thigh bone (femur) meets the pelvis.']
    ]
  },
  male: {
    title: 'Male reproductive system', ratio: 1856 / 2304,
    caption: 'The male reproductive and lower urinary organs in the pelvis, seen from the front.',
    labels: [
      ['Lumbar vertebrae', 0.50, 0.15, 'r', 'The lower-back bones of the spine.'],
      ['Pelvis', 0.20, 0.27, 'r', 'The bony basin that holds and protects the pelvic organs.'],
      ['Ureter', 0.42, 0.31, 'l', 'Carries urine from the kidney down to the bladder.'],
      ['Urinary bladder', 0.50, 0.37, 'r', 'Stores urine until it is passed out of the body.'],
      ['Seminal vesicle', 0.455, 0.41, 'l', 'Makes much of the fluid in semen.'],
      ['Prostate gland', 0.50, 0.463, 'r', 'Makes a fluid that feeds and carries sperm. It surrounds the first part of the urethra.'],
      ['Vas deferens', 0.347, 0.47, 'l', 'The tube that carries sperm from the testis up towards the urethra.'],
      ['Penis', 0.50, 0.60, 'r', 'Carries urine and semen out of the body through the urethra.'],
      ['Epididymis', 0.385, 0.615, 'l', 'A tightly coiled tube on the testis where sperm mature and are stored.'],
      ['Testis', 0.412, 0.66, 'b', 'Makes sperm and the hormone testosterone.']
    ]
  },
  endocrine: {
    title: 'The endocrine glands', ratio: 1856 / 2304,
    caption: 'Hormone-making glands highlighted in the body of a male.',
    labels: [
      ['Pituitary gland', 0.50, 0.118, 'r', 'The "master gland". It makes hormones that control many other glands. It sits under the hypothalamus.'],
      ['Thyroid gland', 0.50, 0.286, 'r', 'Makes thyroid hormones that set the speed of the body\'s metabolism.'],
      ['Thymus', 0.50, 0.373, 'r', 'Where T cells of the immune system mature. It is largest in childhood.'],
      ['Adrenal gland', 0.433, 0.584, 'l', 'Sits on top of the kidney. Makes adrenaline, cortisol and aldosterone.'],
      ['Pancreas', 0.525, 0.597, 'r', 'Makes insulin and glucagon to control blood sugar. It also makes digestive juice.'],
      ['Testis', 0.495, 0.90, 'r', 'A gonad. Makes testosterone and sperm. In females the ovaries make oestrogen and progesterone.']
    ]
  },
  urinary: {
    title: 'The urinary system', ratio: 1856 / 2304,
    caption: 'The kidneys, ureters, bladder and urethra, seen from the front.',
    labels: [
      ['Adrenal gland', 0.40, 0.326, 'l', 'Sits on top of each kidney and makes hormones such as adrenaline and cortisol.'],
      ['Kidney', 0.375, 0.45, 'l', 'Filters the blood, removes waste and extra water as urine and balances salts.'],
      ['Renal pyramids', 0.625, 0.39, 'r', 'Cone-shaped parts of the inner kidney (medulla) where urine is concentrated.'],
      ['Renal artery', 0.458, 0.38, 'b', 'Brings blood from the aorta into the kidney to be filtered.'],
      ['Abdominal aorta', 0.53, 0.30, 'r', 'The body\'s main artery running down the abdomen.'],
      ['Ureter', 0.425, 0.58, 'l', 'A muscular tube that moves urine from the kidney to the bladder.'],
      ['Urinary bladder', 0.492, 0.758, 'r', 'A stretchy bag that stores urine.'],
      ['Urethra', 0.50, 0.87, 'r', 'The tube that carries urine from the bladder out of the body.']
    ]
  },
  digestive: {
    title: 'The digestive system', ratio: 1856 / 2304,
    caption: 'The digestive tract and its helper organs, from the mouth to the anus.',
    labels: [
      ['Mouth and tongue', 0.50, 0.087, 'r', 'Where food is chewed, mixed with saliva and swallowed.'],
      ['Pharynx', 0.50, 0.14, 'r', 'The throat. It leads food to the oesophagus.'],
      ['Oesophagus', 0.508, 0.335, 'r', 'A muscular tube that pushes food down to the stomach.'],
      ['Liver', 0.39, 0.50, 'l', 'Makes bile, stores energy and cleans the blood.'],
      ['Gallbladder', 0.42, 0.53, 'l', 'Stores bile and releases it into the small intestine to help digest fat.'],
      ['Stomach', 0.583, 0.497, 'r', 'Mixes food with acid and enzymes to start digesting protein.'],
      ['Pancreas', 0.54, 0.543, 'r', 'Makes enzymes that digest food and insulin that controls blood sugar.'],
      ['Small intestine', 0.50, 0.67, 'r', 'Where most digestion and absorption of nutrients takes place.'],
      ['Large intestine', 0.363, 0.67, 'l', 'The colon. It absorbs water and forms faeces.'],
      ['Appendix', 0.405, 0.745, 'l', 'A small pouch at the start of the large intestine.'],
      ['Rectum and anus', 0.50, 0.86, 'r', 'The rectum stores faeces and the anus lets them leave the body.']
    ]
  },
  respiratory: {
    title: 'The respiratory system', ratio: 1856 / 2304,
    caption: 'The airways and lungs, from the nose to the diaphragm.',
    labels: [
      ['Nasal cavity', 0.48, 0.15, 'r', 'Warms, moistens and filters the air we breathe in.'],
      ['Pharynx', 0.50, 0.24, 'r', 'The throat, shared by air and food.'],
      ['Larynx', 0.50, 0.285, 'r', 'The voice box. It holds the vocal cords and guards the airway.'],
      ['Trachea', 0.50, 0.39, 'r', 'The windpipe. Rings of cartilage keep it open.'],
      ['Main bronchus', 0.46, 0.47, 'l', 'Each main bronchus carries air into one lung.'],
      ['Bronchioles', 0.43, 0.56, 'l', 'Thin airways that branch through the lung and end at the air sacs (alveoli).'],
      ['Right lung', 0.33, 0.52, 'l', 'Has three lobes.'],
      ['Left lung', 0.65, 0.50, 'r', 'Has two lobes, which leaves room for the heart.'],
      ['Diaphragm', 0.50, 0.60, 'r', 'The main breathing muscle. It flattens to draw air in.']
    ]
  },
  lymphatic: {
    title: 'The lymphatic system', ratio: 1856 / 2304,
    caption: 'Lymph vessels, lymph nodes, the thymus and the spleen.',
    labels: [
      ['Cervical lymph nodes', 0.45, 0.17, 'l', 'Nodes in the neck. They swell when the throat or head is fighting infection.'],
      ['Thymus', 0.50, 0.27, 'l', 'Where T lymphocytes mature.'],
      ['Axillary lymph nodes', 0.69, 0.29, 'r', 'Nodes in the armpit that drain the arm and chest wall.'],
      ['Lymphatic vessels', 0.27, 0.44, 'r', 'Thin tubes that carry lymph (extra tissue fluid) back towards the blood.'],
      ['Spleen', 0.613, 0.463, 'r', 'Filters the blood, removes old red cells and helps immune responses.'],
      ['Thoracic duct', 0.49, 0.40, 'l', 'The main lymph vessel. It empties lymph into a vein near the left shoulder.'],
      ['Inguinal lymph nodes', 0.58, 0.72, 'r', 'Nodes in the groin that drain the legs and lower body.']
    ]
  },
  nervous: {
    title: 'The nervous system (whole body)', ratio: 1856 / 2304,
    caption: 'The brain, spinal cord and the main nerves that reach the arms and legs.',
    labels: [
      ['Brain', 0.50, 0.074, 'r', 'The control centre. It thinks, remembers and sends commands.'],
      ['Brachial plexus', 0.40, 0.225, 'l', 'A network of nerves from the neck that supplies the shoulder and arm.'],
      ['Spinal cord', 0.503, 0.335, 'r', 'Carries signals between the brain and the body and handles simple reflexes.'],
      ['Intercostal nerves', 0.433, 0.335, 'l', 'Nerves that run between the ribs and supply the chest wall.'],
      ['Median and ulnar nerves', 0.317, 0.40, 'l', 'Nerves of the arm and hand that give feeling and move the fingers.'],
      ['Lumbosacral plexus', 0.475, 0.50, 'l', 'A network of nerves from the lower back that supplies the leg.'],
      ['Sciatic nerve', 0.433, 0.615, 'l', 'The longest and thickest nerve in the body. It runs down the back of the thigh.'],
      ['Tibial and fibular nerves', 0.433, 0.805, 'l', 'The branches of the sciatic nerve that supply the lower leg and foot.']
    ]
  },
  nerves: {
    title: 'The brain, spinal cord and spinal nerves', ratio: 1856 / 2304,
    caption: 'The central nervous system and the nerves that leave the spine between the ribs.',
    labels: [
      ['Cerebrum', 0.517, 0.134, 'r', 'The largest part of the brain, used for thinking, senses and movement.'],
      ['Cerebellum', 0.47, 0.23, 'l', 'Coordinates movement and balance.'],
      ['Brainstem', 0.525, 0.27, 'r', 'Controls breathing and heart rate and joins the brain to the spinal cord.'],
      ['Brachial plexus', 0.36, 0.46, 'l', 'A network of nerves for the shoulder and arm.'],
      ['Spinal cord', 0.49, 0.52, 'l', 'The nerve highway that runs down the vertebral column.'],
      ['Intercostal nerves', 0.62, 0.62, 'r', 'Spinal nerves that run along the ribs.'],
      ['Vertebral column', 0.50, 0.86, 'r', 'The backbone. It protects the spinal cord.'],
      ['Nerves of the arm', 0.14, 0.75, 'r', 'Branches of the brachial plexus that run down the arm.']
    ]
  },
  muscles: {
    title: 'The muscular system (front view)', ratio: 1856 / 2304,
    caption: 'The main skeletal muscles on the front of the body.',
    labels: [
      ['Facial muscles', 0.50, 0.121, 'r', 'Small muscles that make expressions.'],
      ['Sternocleidomastoid', 0.458, 0.20, 'r', 'A neck muscle that turns and tilts the head.'],
      ['Trapezius', 0.40, 0.215, 'l', 'A large muscle of the neck and upper back that lifts the shoulders.'],
      ['Deltoid', 0.335, 0.27, 'l', 'The rounded shoulder muscle that raises the arm.'],
      ['Pectoralis major', 0.417, 0.29, 'r', 'The main chest muscle. It pulls the arm across the body.'],
      ['Biceps brachii', 0.317, 0.40, 'l', 'Bends the elbow and turns the forearm.'],
      ['Forearm flexors', 0.283, 0.50, 'l', 'Bend the wrist and fingers.'],
      ['Rectus abdominis', 0.50, 0.416, 'r', 'The "six-pack" muscle that bends the trunk forward.'],
      ['External oblique', 0.417, 0.45, 'l', 'Twists and bends the trunk to the side.'],
      ['Quadriceps femoris', 0.435, 0.60, 'l', 'The four-part muscle at the front of the thigh that straightens the knee.'],
      ['Tibialis anterior', 0.42, 0.80, 'l', 'Lifts the front of the foot when you walk.']
    ]
  },
  torso: {
    title: 'Muscles of the chest and abdomen', ratio: 1856 / 2304,
    caption: 'A close view of the muscles of the neck, shoulder, chest and abdomen.',
    labels: [
      ['Sternocleidomastoid', 0.417, 0.16, 'r', 'Turns the head and bends the neck.'],
      ['Trapezius', 0.34, 0.21, 'l', 'Lifts and pulls back the shoulders.'],
      ['Deltoid', 0.16, 0.30, 'r', 'Raises the arm in every direction.'],
      ['Pectoralis major', 0.433, 0.36, 'r', 'Pulls the arm forward and across the chest.'],
      ['Biceps brachii', 0.17, 0.56, 't', 'Bends the elbow.'],
      ['Serratus anterior', 0.355, 0.54, 'r', 'Holds the shoulder blade against the ribs. It helps push and reach.'],
      ['External oblique', 0.38, 0.66, 'l', 'Twists the trunk and compresses the abdomen.'],
      ['Rectus abdominis', 0.54, 0.64, 'r', 'Bends the spine forward. Its blocks are split by tendon bands.'],
      ['Linea alba', 0.597, 0.55, 'r', 'The pale central line of tough tissue that joins the left and right abdominal muscles.']
    ]
  },
  skeleton: {
    title: 'The human skeleton', ratio: 1856 / 2304,
    caption: 'The adult skeleton seen from the front.',
    labels: [
      ['Skull', 0.50, 0.054, 'r', 'Protects the brain and forms the face.'],
      ['Clavicle', 0.425, 0.204, 'l', 'The collar bone. It links the shoulder to the breastbone.'],
      ['Sternum', 0.50, 0.262, 't', 'The breastbone, in the middle of the chest.'],
      ['Ribs', 0.565, 0.30, 'r', '12 pairs of curved bones that protect the heart and lungs.'],
      ['Humerus', 0.37, 0.30, 'l', 'The bone of the upper arm.'],
      ['Vertebral column', 0.50, 0.40, 'r', 'The spine: 33 vertebrae that support the body and protect the spinal cord.'],
      ['Radius and ulna', 0.31, 0.44, 'l', 'The two bones of the forearm.'],
      ['Pelvis', 0.42, 0.44, 'r', 'The hip bones. They carry the weight of the upper body and protect pelvic organs.'],
      ['Hand bones', 0.283, 0.537, 'l', 'Carpals, metacarpals and phalanges.'],
      ['Femur', 0.44, 0.62, 'l', 'The thigh bone, the longest and strongest bone in the body.'],
      ['Patella', 0.445, 0.715, 'l', 'The kneecap. It protects the knee joint.'],
      ['Tibia and fibula', 0.43, 0.80, 'l', 'The two bones of the lower leg. The tibia (shin bone) carries the weight.'],
      ['Foot bones', 0.42, 0.955, 'l', 'Tarsals, metatarsals and phalanges.']
    ]
  },
  ribcage: {
    title: 'The rib cage and shoulder girdle', ratio: 1856 / 2304,
    caption: 'The bones of the chest, shoulder and upper spine.',
    labels: [
      ['Cervical vertebrae', 0.517, 0.154, 'r', 'The seven neck vertebrae.'],
      ['Clavicle', 0.28, 0.26, 'l', 'The collar bone. It holds the shoulder out from the chest.'],
      ['Shoulder joint', 0.21, 0.32, 'r', 'A ball-and-socket joint between the humerus and the shoulder blade.'],
      ['Humerus', 0.142, 0.564, 'r', 'The bone of the upper arm.'],
      ['Ribs', 0.383, 0.55, 'r', 'Curved bones that protect the heart and lungs and move when we breathe.'],
      ['Sternum', 0.65, 0.50, 'r', 'The breastbone. The ribs join it through cartilage.'],
      ['Xiphoid process', 0.663, 0.607, 'r', 'The small pointed tip at the lower end of the sternum.'],
      ['Thoracic vertebrae', 0.50, 0.66, 'l', 'Twelve vertebrae that each carry a pair of ribs.'],
      ['Lumbar vertebrae', 0.54, 0.86, 'r', 'The large lower-back vertebrae that carry most of the body\'s weight.']
    ]
  },
  skin: {
    title: 'The skin (a cross-section)', ratio: 1856 / 2304,
    caption: 'A block of skin showing its three layers, hair follicles, glands and blood vessels.',
    labels: [
      ['Hair shaft', 0.717, 0.335, 'r', 'The visible part of a hair. It is made of dead keratin.'],
      ['Epidermis', 0.57, 0.455, 'r', 'The thin, waterproof outer layer of skin.'],
      ['Sebaceous gland', 0.45, 0.553, 'l', 'Makes oily sebum that keeps skin and hair soft.'],
      ['Dermis', 0.56, 0.53, 'l', 'The thick middle layer with nerves, blood vessels and glands.'],
      ['Sweat gland', 0.40, 0.585, 'l', 'A coiled tube that makes sweat to cool the body.'],
      ['Hair follicle', 0.69, 0.617, 'r', 'The pit in the skin from which a hair grows.'],
      ['Blood vessels', 0.47, 0.685, 'l', 'Feed the skin and help control body temperature.'],
      ['Hypodermis', 0.667, 0.705, 'r', 'The fatty layer under the skin that insulates and cushions the body.']
    ]
  },
  lungs: {
    title: 'The lungs and bronchial tree', ratio: 1,
    caption: 'The trachea divides into two bronchi that branch inside each lung.',
    labels: [
      ['Trachea', 0.49, 0.167, 'r', 'The windpipe that carries air to the lungs.'],
      ['Carina', 0.50, 0.31, 't', 'The ridge where the trachea divides into the two main bronchi.'],
      ['Main bronchus', 0.41, 0.325, 'l', 'Carries air into one lung.'],
      ['Bronchioles', 0.25, 0.45, 'r', 'Smaller and smaller branches of the airways that lead to the alveoli.'],
      ['Right lung', 0.12, 0.60, 'r', 'Has three lobes.'],
      ['Left lung', 0.86, 0.60, 'l', 'Has two lobes.'],
      ['Heart', 0.50, 0.62, 't', 'Sits in the space between the lungs (the mediastinum).'],
      ['Base of lung', 0.22, 0.79, 'r', 'The bottom of each lung rests on the diaphragm.']
    ]
  },
  heart: {
    title: 'The heart', ratio: 1,
    caption: 'The heart and the great vessels, seen from the front.',
    labels: [
      ['Superior vena cava', 0.37, 0.20, 'l', 'Brings blood from the head and arms to the right atrium.'],
      ['Aorta', 0.50, 0.24, 'r', 'The largest artery. It carries oxygen-rich blood from the left ventricle to the body.'],
      ['Pulmonary trunk', 0.68, 0.36, 'r', 'Carries blood from the right ventricle to the lungs.'],
      ['Pulmonary veins', 0.725, 0.43, 'r', 'Bring oxygen-rich blood from the lungs to the left atrium.'],
      ['Right atrium', 0.333, 0.50, 'l', 'Receives blood from the body.'],
      ['Right ventricle', 0.40, 0.65, 'l', 'Pumps blood to the lungs.'],
      ['Coronary vessels', 0.62, 0.55, 'r', 'The blood vessels that feed the heart muscle itself.'],
      ['Left ventricle', 0.633, 0.72, 'r', 'The strongest chamber. It pumps blood out to the whole body.'],
      ['Apex', 0.64, 0.86, 'r', 'The pointed lower tip of the heart.']
    ]
  }
};
