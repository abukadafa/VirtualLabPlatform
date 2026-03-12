# AI Lab - Python/ML/Data Science Environment
FROM ubuntu:22.04

# Prevent interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies and desktop environment
RUN apt-get update && apt-get install -y \
    # Desktop environment
    xfce4 xfce4-goodies \
    # VNC server
    tightvncserver \
    # X11 and window manager
    x11vnc xvfb \
    # Utilities
    wget curl git vim nano \
    # Python build dependencies
    software-properties-common \
    # Fonts
    fonts-liberation \
    && apt-get clean

# Install Anaconda
RUN wget https://repo.anaconda.com/archive/Anaconda3-2023.09-0-Linux-x86_64.sh -O /tmp/anaconda.sh && \
    bash /tmp/anaconda.sh -b -p /opt/anaconda3 && \
    rm /tmp/anaconda.sh

# Add Anaconda to PATH
ENV PATH=/opt/anaconda3/bin:$PATH

# Install additional Python packages
# Install Data Science and generic tools
RUN conda install -y \
    scikit-learn \
    jupyter \
    jupyterlab \
    pandas \
    numpy \
    matplotlib \
    seaborn \
    && conda clean -a

# Install NLP and CV tools
RUN conda install -y \
    nltk \
    spacy \
    opencv \
    && conda clean -a

# Install Deep Learning frameworks (Heavy)
# Install PyTorch (from pytorch channel)
RUN conda install -y -c pytorch \
    pytorch torchvision torchaudio cpuonly \
    && conda clean -a

# Install TensorFlow and Keras
# Install TensorFlow and Keras via pip (to avoid conda solver issues)
RUN pip install --no-cache-dir \
    tensorflow \
    keras

# Install additional tools
RUN pip install --no-cache-dir \
    h2o \
    pycaret \
    transformers \
    fastai

# Create lab user
RUN useradd -m -s /bin/bash labuser && \
    echo "labuser:labpassword" | chpasswd

# Set up VNC
RUN mkdir -p /home/labuser/.vnc
RUN echo "labpassword" | vncpasswd -f > /home/labuser/.vnc/passwd
RUN chmod 600 /home/labuser/.vnc/passwd

# Create startup script
RUN echo '#!/bin/bash\nvncserver :1 -geometry 1280x720 -depth 24' > /home/labuser/start-vnc.sh && \
    chmod +x /home/labuser/start-vnc.sh && \
    chown -R labuser:labuser /home/labuser

# Set up xstartup for VNC
RUN echo '#!/bin/bash\nxrdb $HOME/.Xresources\nstartxfce4 &' > /home/labuser/.vnc/xstartup && \
    chmod +x /home/labuser/.vnc/xstartup && \
    chown labuser:labuser /home/labuser/.vnc/xstartup

USER labuser
WORKDIR /home/labuser

# Expose VNC port
EXPOSE 5901

CMD ["/bin/bash", "-c", "vncserver :1 -geometry 1280x720 -depth 24 && tail -f /dev/null"]
